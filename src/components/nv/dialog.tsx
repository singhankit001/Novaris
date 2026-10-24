"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** "center" = dialog, "bottom" = mobile sheet, "right" = drawer. */
  placement?: "center" | "bottom" | "right";
  /** Irreversible action: role=alertdialog, requires an explicit confirm button in the footer. */
  destructive?: boolean;
  className?: string;
}

const placements = {
  center: "m-auto w-[min(32rem,calc(100vw-2rem))] rounded-nv-lg",
  bottom: "mx-auto mb-0 mt-auto w-full max-w-xl rounded-t-nv-lg max-h-[88dvh]",
  right: "ml-auto mr-0 my-0 h-dvh max-h-dvh w-[min(26rem,100vw)] rounded-none",
};

/**
 * Native <dialog>: showModal() gives the focus trap, inert background, Esc, and returns
 * focus to the opener (the element focused before open). Backdrop click closes it.
 */
export function Dialog({ open, onClose, title, description, children, footer, placement = "center", destructive, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const uid = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={destructive ? "alertdialog" : undefined}
      aria-labelledby={`${uid}-title`}
      aria-describedby={description ? `${uid}-desc` : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (opener.current instanceof HTMLElement) opener.current.focus();
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "nv-dialog fixed inset-0 z-40 flex-col overflow-hidden border border-nv-graphite-700 bg-white p-0 text-nv-ivory-100 shadow-nv-overlay",
        "backdrop:bg-transparent open:flex",
        placements[placement],
        className,
      )}
    >
      <span aria-hidden className="h-0.5 w-full shrink-0 bg-[var(--nv-gradient-signal)] opacity-80" />
      <header className="flex items-start justify-between gap-4 border-b border-nv-graphite-700 px-5 py-4">
        <div className="min-w-0">
          <h2 id={`${uid}-title`} className="nv-display text-nv-title">
            {title}
          </h2>
          {description && (
            <p id={`${uid}-desc`} className="mt-1 text-pretty text-nv-small text-nv-ivory-200">
              {description}
            </p>
          )}
        </div>
        <IconButton label="Close" icon={<X className="size-4" />} onClick={onClose} />
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-5">{children}</div>
      {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-nv-graphite-700 bg-nv-graphite-800 px-5 py-4">{footer}</footer>}
    </dialog>
  );
}

/** Mobile navigation / filters: same native dialog, anchored right or bottom. */
export function Drawer(props: Omit<DialogProps, "placement"> & { side?: "right" | "bottom" }) {
  const { side = "right", ...rest } = props;
  return <Dialog {...rest} placement={side} />;
}
