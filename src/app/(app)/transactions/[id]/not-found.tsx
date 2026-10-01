import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid gap-3">
      <p>This entry isn&apos;t here any more. It may have been deleted.</p>
      <Link href="/transactions" className="font-semibold text-accent">
        Back to transactions
      </Link>
    </div>
  );
}
