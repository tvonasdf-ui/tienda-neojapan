import type { HTMLAttributes } from 'react';

export type BadgeTone =
  | 'accent'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  mono?: boolean;
}

const base =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

// Semánticos SOLO para estado (design-tokens.md §3). Acento para decorativo.
const tones: Record<BadgeTone, string> = {
  accent: 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30',
  neutral: 'bg-gray-800 text-gray-300 border border-gray-700',
  success: 'bg-green-500/15 text-green-400 border border-green-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  danger: 'bg-red-600/15 text-red-400 border border-red-600/30',
};

/** Chip de estado o condición (A/B/C). Alto `rounded-full`. */
export function Badge({
  tone = 'neutral',
  mono = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        base,
        tones[tone],
        mono ? 'font-mono' : 'font-sans',
        className ?? '',
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}