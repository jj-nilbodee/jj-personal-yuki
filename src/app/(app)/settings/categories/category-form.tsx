'use client';

import { useActionState, useTransition } from 'react';
import { saveCategory, setCategoryArchived } from '@/app/actions';
import { CATEGORY_ICONS, CategoryIcon } from '@/components/category-icon';
import type { Category } from '@/lib/types';

export function CategoryForm({ category }: { category?: Category }) {
  const [state, action, pending] = useActionState(saveCategory, undefined);
  return (
    <form action={action} className="grid gap-3">
      {category && <input type="hidden" name="id" value={category.id} />}
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Name</span>
        <input name="name" defaultValue={category?.name} required maxLength={40} className="field" />
      </label>
      {!category && (
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Type</span>
          <select name="type" className="field" defaultValue="expense">
            <option value="expense">Spending</option>
            <option value="income">Income</option>
          </select>
        </label>
      )}
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">Icon</legend>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(CATEGORY_ICONS).map((name) => (
            <label key={name} className="cursor-pointer">
              <input type="radio" name="icon" value={name} defaultChecked={(category?.icon ?? 'circle') === name} className="peer sr-only" />
              <span className="grid size-11 place-items-center rounded-full border border-border peer-checked:border-accent peer-checked:bg-accent-soft peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                <CategoryIcon name={name} />
                <span className="sr-only">{name}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error && <p className="text-sm font-semibold text-expense" role="alert">{state.error}</p>}
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {category ? 'Save' : 'Add category'}
      </button>
    </form>
  );
}

export function ArchiveCategoryButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn text-sm text-ink-soft" disabled={pending} onClick={() => start(() => setCategoryArchived(id, !archived))}>
      {archived ? 'Show' : 'Hide'}
    </button>
  );
}
