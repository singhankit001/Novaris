"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "./cn";

export interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

/**
 * Hover and keyboard-focus tooltip. Esc dismisses. Touch: tap focuses the wrapper child,
 * which shows the tip; never carries information that exists nowhere else.
 */
export function Tooltip({ text, children, className }: TooltipProps) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      onKeyDown={(e) => e.key === "Escape" && setShow(false)}
      aria-describedby={id}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-64 -translate-x-1/2 rounded-nv-sm",
          "bg-nv-ivory-100 px-2.5 py-1.5 text-nv-micro font-medium text-white shadow-nv-popover transition-opacity duration-150",
          show ? "opacity-100" : "opacity-0",
        )}
      >
        {text}
      </span>
    </span>
  );
}
