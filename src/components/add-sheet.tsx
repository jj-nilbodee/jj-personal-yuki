'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Camera, PenLine, X } from 'lucide-react';
import { prepareSlip } from '@/lib/slip/prepare';
import { formatDay, formatMoney } from '@/lib/format';
import { PawProgress } from './yuki';

type State =
  | { step: 'closed' }
  | { step: 'choose' }
  | { step: 'uploading' }
  | { step: 'duplicate'; existing: { id: string; date: string; amount: number | null } }
  | { step: 'failed' };

const AddSheetContext = createContext<{ open: () => void }>({ open: () => {} });
export const useAddSheet = () => useContext(AddSheetContext);

export function AddSheetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ step: 'closed' });
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const open = useCallback(() => setState({ step: 'choose' }), []);
  const close = useCallback(() => setState({ step: 'closed' }), []);

  useEffect(() => {
    if (state.step === 'closed') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.step, close]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setState({ step: 'uploading' });
    try {
      const { blob, qrText } = await prepareSlip(file);
      const body = new FormData();
      body.append('image', new File([blob], 'slip', { type: blob.type }));
      if (qrText) body.append('qr', qrText);
      const res = await fetch('/api/slips', { method: 'POST', body });
      const json = await res.json();
      if (res.status === 409) return setState({ step: 'duplicate', existing: json.existing });
      if (!res.ok) throw new Error(json.error);
      setState({ step: 'closed' });
      router.push(`/transactions/${json.id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setState({ step: 'failed' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <AddSheetContext.Provider value={{ open }}>
      {children}
      {/* No capture attribute: iOS then offers camera, photo library (where bank apps save slips) and files. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {state.step !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal aria-label="Add a transaction">
          <button className="absolute inset-0 bg-black/30" aria-label="Close" onClick={close} />
          <div className="card safe-bottom relative w-full max-w-md rounded-b-none p-5 md:rounded-b-[1.25rem]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Add</h2>
              <button onClick={close} className="grid size-11 place-items-center rounded-full" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            {state.step === 'choose' && (
              <div className="grid gap-3">
                <button className="btn btn-primary h-16 text-base" onClick={() => fileRef.current?.click()} autoFocus>
                  <Camera className="size-5" /> Scan or upload a slip
                </button>
                <Link href="/transactions/new" onClick={close} className="btn btn-quiet h-14">
                  <PenLine className="size-5" /> Enter manually
                </Link>
              </div>
            )}

            {state.step === 'uploading' && (
              <div className="py-6">
                <PawProgress />
              </div>
            )}

            {state.step === 'duplicate' && (
              <div className="grid gap-4">
                <p>
                  This slip was already logged on {formatDay(state.existing.date)} for{' '}
                  <span className="num font-semibold">{formatMoney(state.existing.amount)}</span>.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link href={`/transactions/${state.existing.id}`} onClick={close} className="btn btn-primary">
                    Open it
                  </Link>
                  <button className="btn btn-quiet" onClick={close}>
                    Done
                  </button>
                </div>
              </div>
            )}

            {state.step === 'failed' && (
              <div className="grid gap-4">
                <p>Couldn&apos;t upload this one. Retry or enter it yourself.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                    Retry
                  </button>
                  <Link href="/transactions/new" onClick={close} className="btn btn-quiet">
                    Enter manually
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AddSheetContext.Provider>
  );
}

export function AddButton({ className = 'btn btn-primary', children }: { className?: string; children: React.ReactNode }) {
  const { open } = useAddSheet();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
