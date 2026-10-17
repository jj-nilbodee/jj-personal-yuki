import { redirect } from 'next/navigation';
import { skipOnboardingStep } from '@/app/actions';
import { AccountForm } from '@/components/account-form';
import { ProfileForm } from '@/components/profile-form';
import { TransactionEditor } from '@/components/transaction-editor';
import { YukiArt } from '@/components/yuki';
import { transferLabel } from '@/lib/accounts';
import { formatSigned } from '@/lib/format';
import { getProfile } from '@/lib/profile';
import { REPEAT_LABEL, repeatOf } from '@/lib/recurring';
import { requireUser } from '@/lib/supabase/server';
import { ONBOARDING_STEPS, type Account, type Category, type OnboardingStep, type RecurringRule } from '@/lib/types';
import { SalaryForm } from './salary-form';

// First use (PRD part 3, section 7: the one place Yuki speaks in first person).
// Each step saves as it goes and profiles.onboarding_step remembers where the
// user is, so closing the app halfway resumes at the same question.
const COPY: Record<OnboardingStep, { title: string; body: string }> = {
  name: { title: 'What should I call you?', body: 'Just so I know whose money I’m keeping an eye on.' },
  account: {
    title: 'Where does your money usually live?',
    body: 'Start with the account you use most. New entries go there unless you pick another, and you can add more later.',
  },
  salary: { title: 'Does a salary come in every month?', body: 'Tell me how much and when, and I’ll log it on payday.' },
  bills: {
    title: 'Any bills that come round regularly?',
    body: 'Rent, phone, subscriptions. Add each one and I’ll log it when it’s due.',
  },
  budget: {
    title: 'How much do you want to spend in a month?',
    body: 'I’ll show what’s left as the month goes. You can change it any time in Settings.',
  },
};

function SkipButton({ step, label = 'Not now' }: { step: OnboardingStep; label?: string }) {
  return (
    <form action={skipOnboardingStep.bind(null, step)} className="grid">
      <button className="btn text-ink-soft">{label}</button>
    </form>
  );
}

export default async function WelcomePage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile();
  const step = profile?.onboarding_step;
  if (!step) redirect('/');

  const [{ data: accountRows }, { data: categoryRows }, { data: ruleRows }] = await Promise.all([
    supabase.from('accounts').select('*').eq('archived', false).order('name'),
    step === 'salary' || step === 'bills'
      ? supabase.from('categories').select('*').eq('archived', false).order('name')
      : Promise.resolve({ data: [] }),
    // Everything that already repeats, including the salary from the step before.
    step === 'bills' ? supabase.from('recurring_rules').select('*').order('created_at') : Promise.resolve({ data: [] }),
  ]);
  const accounts = (accountRows ?? []) as Account[];
  const categories = (categoryRows ?? []) as Category[];
  const rules = (ruleRows ?? []) as RecurringRule[];
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const name = profile.display_name;
  const { title, body } = COPY[step];

  return (
    // grid-cols-1 (minmax(0, 1fr)) keeps long bill names truncating instead of widening the page.
    <main className="mx-auto grid w-full max-w-md grid-cols-1 gap-6 px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-12">
      <YukiArt pose="loaf" size={104} className="justify-self-center" />
      <header className="grid gap-2 text-center">
        <p className="text-sm text-ink-soft">
          Step {ONBOARDING_STEPS.indexOf(step) + 1} of {ONBOARDING_STEPS.length}
        </p>
        {step === 'account' && <p className="font-display font-semibold">Nice to meet you{name ? `, ${name}` : ''}.</p>}
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="text-ink-soft">{body}</p>
      </header>

      {step === 'name' && (
        <>
          <div className="card p-4">
            <ProfileForm profile={profile} step="name" suggestedName={user.name?.split(/\s+/)[0]} />
          </div>
          <SkipButton step="name" label="Skip" />
        </>
      )}

      {step === 'account' &&
        (accounts.length > 0 ? (
          // The account already exists (e.g. saved in another tab); just move on.
          <SkipButton step="account" label="Continue" />
        ) : (
          <div className="card p-4">
            <AccountForm onboarding />
          </div>
        ))}

      {step === 'salary' && (
        <>
          <div className="card p-4">
            <SalaryForm
              accounts={accounts}
              categoryId={categories.find((c) => c.type === 'income' && c.name === 'Salary')?.id ?? null}
            />
          </div>
          <SkipButton step="salary" label="Not now, my income varies" />
        </>
      )}

      {step === 'bills' && (
        <>
          {rules.length > 0 && (
            <ul className="card divide-y divide-border">
              {rules.map((r) => (
                <li key={r.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {r.type === 'transfer'
                        ? transferLabel(r.account_id, r.to_account_id, accountById)
                        : (r.merchant ?? categoryName.get(r.category_id ?? '') ?? 'Recurring')}
                    </span>
                    <span className="block text-sm text-ink-soft">{REPEAT_LABEL[repeatOf(r)]}</span>
                  </span>
                  <span className="num">{formatSigned(r.amount, r.type)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="card p-4">
            {/* Remount after each save so the form is empty for the next one. */}
            <TransactionEditor key={rules.length} categories={categories} accounts={accounts} onboarding />
          </div>
          <SkipButton step="bills" label={rules.some((r) => r.type === 'expense') ? 'Done with bills' : 'Not now'} />
        </>
      )}

      {step === 'budget' && (
        <>
          <div className="card p-4">
            <ProfileForm profile={profile} step="budget" />
          </div>
          <SkipButton step="budget" />
        </>
      )}
    </main>
  );
}
