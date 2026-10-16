/** "Counts toward next month" for income: a salary paid at month-end that covers the month after. */
export function NextMonthToggle({
  checked,
  defaultChecked,
  onChange,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3">
      <input
        type="checkbox"
        name="for_next_month"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange && ((e) => onChange(e.target.checked))}
        className="mt-0.5 size-5 shrink-0 accent-accent"
      />
      <span>
        <span className="block">Counts toward next month</span>
        <span className="block text-sm text-ink-soft">For pay that arrives at the end of a month and covers the month after.</span>
      </span>
    </label>
  );
}
