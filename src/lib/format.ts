// Detail-oriented: amounts are shown exactly, never rounded or abbreviated.
const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '฿—';
  return `฿${money.format(Number(amount))}`;
}

export function formatSigned(amount: number | null, type: 'income' | 'expense'): string {
  return `${type === 'income' ? '+' : '−'}${formatMoney(amount)}`;
}

/** Today's date in Bangkok as YYYY-MM-DD, matching the database default. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now);
}

export function formatDay(iso: string, today = todayISO()): string {
  if (iso === today) return 'Today';
  const d = new Date(`${iso}T00:00:00Z`);
  const t = new Date(`${today}T00:00:00Z`);
  const diff = Math.round((t.getTime() - d.getTime()) / 86_400_000);
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(d.getUTCFullYear() !== t.getUTCFullYear() && { year: 'numeric' }),
    timeZone: 'UTC',
  });
}

export function formatMonth(iso: string): string {
  return new Date(`${iso.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function daysUntil(iso: string, today = todayISO()): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
