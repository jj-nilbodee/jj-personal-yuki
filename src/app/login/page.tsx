import { YukiArt } from '@/components/yuki';
import { GoogleButton } from './google-button';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-8 px-6 text-center">
      <YukiArt pose="loaf" size={168} />
      {/* The one moment Yuki speaks in first person (PRD part 3, section 7). */}
      <p className="font-display text-xl leading-relaxed font-bold">
        Hi, I&apos;m Yuki. I&apos;m a cat. I&apos;ll keep an eye on your money, quietly. Mostly.
      </p>
      <GoogleButton />
      {error && <p className="text-sm text-ink-soft">Sign-in didn&apos;t finish. Try again.</p>}
    </main>
  );
}
