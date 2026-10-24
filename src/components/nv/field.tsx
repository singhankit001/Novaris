import type { InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "./cn";

const control =
  "w-full rounded-nv-sm border bg-nv-graphite-850 px-3 text-nv-body text-nv-ivory-100 placeholder:text-nv-graphite-400 " +
  "transition-colors duration-150 border-nv-graphite-500 hover:border-nv-ivory-300 " +
  "disabled:cursor-not-allowed disabled:opacity-45 aria-[invalid=true]:border-nv-danger";

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
      <label htmlFor={id} className={cn("text-nv-small font-medium text-nv-ivory-200", hideLabel && "sr-only")}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-nv-micro text-nv-ivory-300">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-nv-micro text-nv-danger">
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
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-nv-ivory-300">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={fid}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          className={cn(control, "min-h-11", leading && "pl-9", className)}
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
        className={cn(control, "min-h-11 py-2.5 leading-relaxed", className)}
        {...rest}
      />
    </Shell>
  );
}
