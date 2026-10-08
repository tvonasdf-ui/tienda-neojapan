import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-sans font-medium ' +
  'rounded-lg transition-colors duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed select-none';

const variants: Record<ButtonVariant, string> = {
  // Acento decorativo: cyan-400 (dark, por defecto). Texto sobre acento: gray-950.
  primary:
    'bg-cyan-400 text-gray-950 hover:bg-cyan-300 active:bg-cyan-500',
  secondary:
    'bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-700 ' +
    'active:bg-gray-600',
  ghost:
    'bg-transparent text-gray-100 hover:bg-gray-800 active:bg-gray-700',
  // Rojo reservado a error/peligro (nunca decorativo).
  danger:
    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-6 py-3',
};

/**
 * Botón base del sistema. Estados explícitos según `design-tokens.md` §7:
 * default/hover/active/focus/disabled/loading.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={[
          base,
          variants[variant],
          sizes[size],
          fullWidth ? 'w-full' : '',
          className ?? '',
        ].join(' ')}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);