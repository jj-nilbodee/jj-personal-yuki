import { describe, expect, it } from 'vitest';
import { caretAfterFormat, formatAmountInput } from './amount';

describe('formatAmountInput', () => {
  it.each([
    ['', ''],
    ['999', '999'],
    ['1000', '1,000'],
    ['1234567.8', '1,234,567.8'],
    ['45,000', '45,000'], // already formatted stays the same
    ['1,0000', '10,000'], // regroups after an edit in the middle
    ['฿ 12 500', '12,500'],
    ['007', '7'],
    ['0.5', '0.5'],
    ['.5', '0.5'],
    ['12.', '12.'], // keeps the point while the user is still typing
    ['1.2.3', '1.23'],
    ['3.14159', '3.14'],
  ])('%j → %j', (raw, formatted) => {
    expect(formatAmountInput(raw)).toBe(formatted);
  });

  it('drops a minus unless negatives are allowed', () => {
    expect(formatAmountInput('-1500')).toBe('1,500');
    expect(formatAmountInput('-1500', { allowNegative: true })).toBe('-1,500');
    expect(formatAmountInput('-', { allowNegative: true })).toBe('-');
  });
});

describe('caretAfterFormat', () => {
  it('keeps the caret after the same digit when a separator appears', () => {
    // Typing the 4th digit at the end: "1000|" → "1,000|".
    expect(caretAfterFormat('1000', 4, '1,000')).toBe(5);
    // Typing "5" after "1" in "1|,000" gives "15,000" with the caret after the 5.
    expect(caretAfterFormat('15,000', 2, '15,000')).toBe(2);
    // Deleting the "5" in "1,5|00" leaves "1,00" → "100" with the caret after the 1.
    expect(caretAfterFormat('1,00', 2, '100')).toBe(1);
  });
});
