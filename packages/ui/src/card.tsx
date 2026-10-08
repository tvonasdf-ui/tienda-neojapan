import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Elevación extra + ring de foco al hacer hover: tarjetas clicables/links. */
  interactive?: boolean;
}

/**
 * Tarjeta base: superficie `gray-900` sobre fondo `gray-950`, radio `rounded-lg`,
 * sombra sutil. Variante `interactive` sube a `shadow-md` en hover/focus.
 */
export function Card({
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'rounded-lg bg-gray-900 shadow-sm',
        interactive
          ? 'transition-shadow duration-150 hover:shadow-md ' +
            'focus-visible:outline-none focus-visible:ring-2 ' +
            'focus-visible:ring-cyan-400'
          : '',
        className ?? '',
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}