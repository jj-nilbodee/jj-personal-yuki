'use client';

import { useActionState } from 'react';
import { saveProfile } from '@/app/actions';
import type { Profile } from '@/lib/types';
import { AmountInput } from './amount-input';

/**
 * What Yuki calls the user and their monthly budget. Onboarding asks for one at
 * a time (`step`); Settings edits both.
 */
export function ProfileForm({
  profile,
  step,
  suggestedName,
}: {
  profile: Pick<Profile, 'display_name' | 'monthly_budget'> | null;
  step?: 'name' | 'budget';
  /** Pre-fills an empty name, e.g. the first name from Google sign-in. */
  suggestedName?: string | null;
}) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  return (
    <form action={action} className="grid gap-3">
      {step && <input type="hidden" name="onboarding_step" value={step} />}
      {step !== 'budget' && (
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Your name</span>
          <input
            name="display_name"
            defaultValue={profile?.display_name ?? suggestedName ?? ''}
            required={step === 'name'}
            maxLength={40}
            autoComplete="given-name"
            className="field"
          />
        </label>
      )}
      {step !== 'name' && (
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Monthly spending budget (฿)</span>
          <AmountInput
            name="monthly_budget"
            defaultValue={profile?.monthly_budget}
            required={step === 'budget'}
            placeholder="0.00"
            className="field num"
          />
        </label>
      )}
      {state?.error && (
        <p className="text-sm font-semibold text-expense" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {step ? 'Continue' : 'Save'}
      </button>
    </form>
  );
}
