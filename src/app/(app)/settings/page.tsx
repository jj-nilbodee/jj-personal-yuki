import Link from 'next/link';
import { ChevronRight, Repeat, Shapes, Wallet } from 'lucide-react';
import { signOut } from '@/app/actions';
import { YukiArt } from '@/components/yuki';
import { requireUser } from '@/lib/supabase/server';
import { ThemePicker } from './theme-picker';

const LINKS = [
  { href: '/settings/categories', label: 'Categories', icon: Shapes },
  { href: '/settings/accounts', label: 'Accounts', icon: Wallet },
  { href: '/settings/recurring', label: 'Recurring', icon: Repeat },
];

// Written by the owner (PRD part 3, section 7: Settings > About).
const ABOUT_YUKI = 'Yuki is a Scottish longhair who takes paperwork very seriously.';

export default async function SettingsPage() {
  const { user } = await requireUser();
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-2xl font-extrabold">Settings</h1>

      <nav className="card divide-y divide-border overflow-hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex min-h-14 items-center gap-3 px-4">
            <l.icon className="size-5 text-ink-soft" aria-hidden />
            <span className="flex-1 font-display font-semibold">{l.label}</span>
            <ChevronRight className="size-4 text-ink-soft" aria-hidden />
          </Link>
        ))}
      </nav>

      <section className="grid gap-2">
        <h2 className="font-bold">Theme</h2>
        <ThemePicker />
      </section>

      <section className="card grid gap-3 p-4">
        <p className="text-sm text-ink-soft">Signed in as</p>
        <p className="font-medium break-all">{user.email}</p>
        <form action={signOut}>
          <button className="btn btn-quiet">Sign out</button>
        </form>
      </section>

      <section className="card flex items-center gap-4 p-4">
        <YukiArt pose="alt" size={88} />
        <div>
          <h2 className="font-bold">About Yuki</h2>
          <p className="mt-1 text-sm text-ink-soft">{ABOUT_YUKI}</p>
        </div>
      </section>
    </div>
  );
}
