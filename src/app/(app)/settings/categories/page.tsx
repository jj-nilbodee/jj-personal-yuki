import { BackHeader } from '@/components/back-header';
import { requireUser } from '@/lib/supabase/server';
import type { Category } from '@/lib/types';
import { CategoryForm, ArchiveCategoryButton } from './category-form';
import { CategoryIcon } from '@/components/category-icon';

export default async function CategoriesPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from('categories').select('*').order('name');
  const categories = (data ?? []) as Category[];

  return (
    <div className="grid gap-6">
      <BackHeader href="/settings" title="Categories" />
      {(['expense', 'income'] as const).map((type) => (
        <section key={type} className="grid gap-2">
          <h2 className="font-bold">{type === 'expense' ? 'Spending' : 'Income'}</h2>
          <ul className="card divide-y divide-border">
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <li key={c.id} className={`flex items-center gap-3 px-4 py-2 ${c.archived ? 'text-ink-soft' : ''}`}>
                  <CategoryIcon name={c.icon} />
                  <details className="min-w-0 flex-1">
                    <summary className="flex min-h-11 cursor-pointer items-center">
                      {c.name}
                      {c.archived && <span className="ml-2 text-xs">(hidden)</span>}
                    </summary>
                    <div className="pb-3">
                      <CategoryForm category={c} />
                    </div>
                  </details>
                  <ArchiveCategoryButton id={c.id} archived={c.archived} />
                </li>
              ))}
          </ul>
        </section>
      ))}
      <section className="grid gap-2">
        <h2 className="font-bold">Add a category</h2>
        <div className="card p-4">
          <CategoryForm />
        </div>
      </section>
    </div>
  );
}
