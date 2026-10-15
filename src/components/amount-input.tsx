'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import { caretAfterFormat, formatAmountInput } from '@/lib/amount';

type Props = Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type'> & {
  /** Controlled value (raw or formatted); omit and use defaultValue for an uncontrolled field. */
  value?: string;
  defaultValue?: string | number | null;
  onValueChange?: (formatted: string) => void;
  allowNegative?: boolean;
};

/**
 * Amount field that adds thousands separators as the user types ("45,000.50").
 * The form posts the formatted text; server actions strip the commas.
 */
export function AmountInput({ value, defaultValue, onValueChange, allowNegative, ref, ...props }: Props) {
  const opts = { allowNegative };
  const [own, setOwn] = useState(() => formatAmountInput(String(defaultValue ?? ''), opts));
  const shown = value === undefined ? own : formatAmountInput(value, opts);
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  // Formatting can add or remove separators before the caret; put it back after the same digit.
  useLayoutEffect(() => {
    if (caret.current !== null && input.current === document.activeElement) {
      input.current?.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
  });

  // React resets a form after its action succeeds (form.reset()); a controlled field has to follow.
  useEffect(() => {
    const form = input.current?.form;
    if (!form || value !== undefined) return;
    const reset = () => setOwn(formatAmountInput(String(defaultValue ?? ''), { allowNegative }));
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [value, defaultValue, allowNegative]);

  return (
    <input
      {...props}
      ref={(el) => {
        input.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      onChange={(e) => {
        const raw = e.target.value;
        const formatted = formatAmountInput(raw, opts);
        caret.current = caretAfterFormat(raw, e.target.selectionStart ?? raw.length, formatted);
        if (value === undefined) setOwn(formatted);
        onValueChange?.(formatted);
      }}
    />
  );
}
