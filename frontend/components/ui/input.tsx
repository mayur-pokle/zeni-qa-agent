import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard text input for the redesign. 40px tall, soft border, focus
 * ring in brand teal. Matches the buttons' radius so they nest cleanly
 * in form rows.
 */
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15",
        className
      )}
      {...rest}
    />
  );
});

/**
 * Select with the same visual weight as Input. Native <select> for
 * accessibility and zero JS overhead.
 */
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-[8px] border border-line bg-surface px-3 pr-8 text-[14px] text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

/**
 * Field wrapper that bundles label + input + optional helper/error
 * text. Keeps form rows visually consistent across the app.
 */
export function Field({
  label,
  helper,
  error,
  required,
  children
}: {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-medium text-ink-2">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-[12px] text-error">{error}</span>
      ) : helper ? (
        <span className="text-[12px] text-ink-3">{helper}</span>
      ) : null}
    </label>
  );
}
