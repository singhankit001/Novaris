import type { InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "./cn";

/* Silver well that lifts to white with an electric-blue ring on focus. */
export const controlClasses =
  "w-full rounded-nv-sm border border-nv-graphite-500/70 bg-nv-graphite-850 px-3.5 text-nv-body text-nv-ivory-100 " +
  "shadow-[inset_0_1px_2px_rgb(21_23_29/0.06)] placeholder:text-nv-graphite-400 " +
  "transition-[background-color,border-color,box-shadow] duration-150 ease-nv-out hover:border-nv-graphite-500 " +
  "focus:border-nv-copper-400 focus:bg-white focus:shadow-[0_0_0_4px_rgb(47_84_255/0.14)] " +
  "disabled:cursor-not-allowed disabled:opacity-45 aria-[invalid=true]:border-nv-danger aria-[invalid=true]:focus:shadow-[0_0_0_4px_rgb(194_44_37/0.14)]";

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  hideLabel?: boolean;
  id?: string;
}

function Shell({ label, hint, error, hideLabel, id, children }: FieldShellProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={cn("text-nv-small font-medium text-nv-ivory-100", hideLabel && "sr-only")}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-nv-micro text-nv-ivory-300">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-nv-micro font-medium text-nv-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldShellProps {
  leading?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, hint, error, hideLabel, leading, className, id, ref, ...rest }: InputProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <div className="relative">
        {leading && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-nv-ivory-300">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={fid}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          className={cn(controlClasses, "min-h-11", leading && "pl-10", className)}
          {...rest}
        />
      </div>
    </Shell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldShellProps {
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ label, hint, error, hideLabel, className, id, rows = 4, ref, ...rest }: TextareaProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <textarea
        ref={ref}
        id={fid}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cn(controlClasses, "min-h-11 py-2.5 leading-relaxed", className)}
        {...rest}
      />
    </Shell>
  );
}
