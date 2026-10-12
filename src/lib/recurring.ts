import type { Frequency, RecurringRule } from './types';

/**
 * A repeat schedule as the user picks it. "month_end" is a monthly rule anchored
 * on day 31, which next_occurrence clamps to the last day of shorter months.
 */
export type Repeat = Frequency | 'month_end';

export const REPEATS: Repeat[] = ['weekly', 'monthly', 'month_end', 'yearly'];

const MONTH_END_ANCHOR = 31;

export const REPEAT_LABEL: Record<Repeat, string> = {
  weekly: 'Every week',
  monthly: 'Every month',
  month_end: 'Every month, last day',
  yearly: 'Every year',
};

export function parseRepeat(value: string | null): Repeat | null {
  return REPEATS.find((r) => r === value) ?? null;
}

/** Frequency plus anchor day; a null anchor means "the day of the start date". */
export function scheduleFor(repeat: Repeat): { frequency: Frequency; anchorDay: number | null } {
  return repeat === 'month_end' ? { frequency: 'monthly', anchorDay: MONTH_END_ANCHOR } : { frequency: repeat, anchorDay: null };
}

export function repeatOf(rule: Pick<RecurringRule, 'frequency' | 'anchor_day'>): Repeat {
  return rule.frequency === 'monthly' && rule.anchor_day === MONTH_END_ANCHOR ? 'month_end' : rule.frequency;
}

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** "Every month on the 15th", worded from the date the schedule starts at. */
export function repeatLabel(repeat: Repeat, iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return REPEAT_LABEL[repeat];
  switch (repeat) {
    case 'weekly':
      return `Every week on ${d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })}`;
    case 'monthly':
      return `Every month on the ${ordinal(d.getUTCDate())}`;
    case 'month_end':
      return 'Every month on the last day';
    case 'yearly':
      return `Every year on ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`;
  }
}
