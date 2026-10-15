import Link from 'next/link';
import { ArrowDownLeft, Plus } from 'lucide-react';
import { AddButton } from './add-sheet';
import { YukiArt } from './yuki';

/**
 * Nothing logged yet (PRD part 3, section 7: Yuki asleep). Asks for income first
 * so the balance means something, unless a salary is already set to log itself;
 * asking then would get it counted twice.
 */
export function EmptyLedger({ name, salaryScheduled }: { name: string | null; salaryScheduled: boolean }) {
  return (
    <section className="card flex flex-col items-center gap-4 p-8 text-center">
      <YukiArt pose="asleep" size={120} />
      <p>Nothing logged yet{name ? `, ${name}` : ''}. Yuki&apos;s napping until you add one.</p>
      {salaryScheduled ? (
        <>
          <p className="text-sm text-ink-soft">Your salary logs itself on payday. Add what you spend in the meantime.</p>
          <AddButton className="btn btn-primary">
            <Plus className="size-5" aria-hidden /> Add an expense
          </AddButton>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">Start with your income so the balance shows what&apos;s left to spend.</p>
          <Link href="/transactions/new?type=income" className="btn btn-primary">
            <ArrowDownLeft className="size-5" aria-hidden /> Add your income
          </Link>
          <AddButton className="btn btn-quiet">
            <Plus className="size-5" aria-hidden /> Add an expense
          </AddButton>
        </>
      )}
    </section>
  );
}
