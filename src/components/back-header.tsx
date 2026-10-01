import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function BackHeader({ href, title }: { href: string; title: string }) {
  return (
    <header className="flex items-center gap-2">
      <Link href={href} className="-ml-3 grid size-11 place-items-center rounded-full" aria-label="Back">
        <ChevronLeft className="size-5" />
      </Link>
      <h1 className="font-display text-xl font-extrabold">{title}</h1>
    </header>
  );
}
