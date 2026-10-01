import { AddSheetProvider } from '@/components/add-sheet';
import { AppNav } from '@/components/app-nav';
import { requireUser } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <AddSheetProvider>
      <div className="md:flex">
        <AppNav />
        <main className="mx-auto w-full max-w-2xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28 md:px-8 md:pt-10 md:pb-12">
          {children}
        </main>
      </div>
    </AddSheetProvider>
  );
}
