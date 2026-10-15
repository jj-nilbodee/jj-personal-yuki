/**
 * Formats what the user typed into an amount field as they type: thousands
 * separators, at most one decimal point and two decimal places. Anything else
 * (letters, ฿, spaces) is dropped. A leading minus is kept only when allowed.
 * Idempotent, so it can format both raw and already formatted values.
 */
export function formatAmountInput(raw: string, { allowNegative = false } = {}): string {
  const negative = allowNegative && raw.trimStart().startsWith('-');
  const cleaned = raw.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, '');
  const fraction = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = fraction === null ? grouped : `${grouped || '0'}.${fraction}`;
  return negative ? `-${body}` : body;
}

/** Where the caret belongs in `formatted` so it sits after the same number of digits as in `raw`. */
export function caretAfterFormat(raw: string, caret: number, formatted: string): number {
  const significant = raw.slice(0, caret).replace(/[^\d.-]/g, '').length;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (seen === significant) return i;
    if (/[\d.-]/.test(formatted[i])) seen++;
  }
  return formatted.length;
}
