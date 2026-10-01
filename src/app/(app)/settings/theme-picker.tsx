'use client';

import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';
const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Persists the override and applies it the same way the pre-paint script in the root layout does. */
function applyTheme(value: Theme) {
  try {
    if (value === 'system') localStorage.removeItem('yuki-theme');
    else localStorage.setItem('yuki-theme', value);
  } catch {
    // Private mode: the choice still applies for this visit.
  }
  const root = document.documentElement;
  if (value === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', value);
}

export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const saved = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the pre-paint theme once on mount
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  function choose(value: Theme) {
    setTheme(value);
    applyTheme(value);
  }

  return (
    <div className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => choose(o.value)}
          className={`btn ${theme === o.value ? 'btn-quiet' : 'text-ink-soft'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
