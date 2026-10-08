import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
}

const base =
  "min-h-11 w-full rounded-xl border bg-gray-800 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-400 " +
  "transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const borderByError = "border-gray-700 focus-visible:border-cyan-400";

/**
 * Input con label y estado de error explícito (texto/borde rojo + mensaje,
 * nunca solo color — `design-tokens.md` §7).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leading, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={["w-full", className ?? ""].join(" ")}>
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-gray-200"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 font-mono text-sm">
            {leading}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={[base, borderByError, leading ? "pl-9" : ""].join(" ")}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-sm text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
