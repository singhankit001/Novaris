"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-styles";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks activation without removing focusability. */
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  leading,
  trailing,
  disabled,
  children,
  className,
  type = "button",
  onClick,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="nv-spin size-4" /> : leading}
      {children}
      {!loading && trailing}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, "leading" | "trailing" | "children" | "size"> {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  icon: ReactNode;
}

export function IconButton({ label, icon, variant = "ghost", className, ...rest }: IconButtonProps) {
  return (
    <Button
      {...rest}
      variant={variant}
      aria-label={label}
      title={label}
      className={cn("size-11 min-h-11 p-0", className)}
    >
      <span aria-hidden className="grid place-items-center">
        {icon}
      </span>
    </Button>
  );
}
