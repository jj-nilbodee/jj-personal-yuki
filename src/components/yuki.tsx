import Image from 'next/image';
import { PawPrint } from 'lucide-react';

// The fixed set of moments where Yuki appears (docs/prd/part-3-design.md, section 7).
// The owner is drawing the curled-asleep and sitting-on-it poses; until then those
// moments use the loaf artwork from the logo.
const ART = {
  loaf: '/brand/yuki-loaf.png',
  alt: '/brand/yuki-alt.png',
  asleep: '/brand/yuki-loaf.png',
  sitting: '/brand/yuki-loaf.png',
} as const;

export function YukiArt({ pose, size = 96, className = '' }: { pose: keyof typeof ART; size?: number; className?: string }) {
  return (
    <Image
      src={ART[pose]}
      alt="Yuki, a fluffy grey cat"
      width={size}
      height={size}
      className={`rounded-[22%] ${className}`}
      priority={pose === 'loaf'}
    />
  );
}

/** Replaces a generic spinner while a slip is being read. */
export function PawProgress({ label = 'Yuki is looking this over' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-ink-soft">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <PawPrint
            key={i}
            className="size-4 animate-pulse text-accent"
            style={{ animationDelay: `${i * 250}ms`, animationDuration: '1.5s' }}
          />
        ))}
      </span>
      <span className="text-sm">{label}</span>
    </div>
  );
}
