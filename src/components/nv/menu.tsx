"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface MenuProps {
  /** Accessible name of the trigger button. */
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  className?: string;
}

/** WAI-ARIA menu button: Enter/Space/ArrowDown open, arrows + Home/End + type-ahead, Esc returns focus. */
export function Menu({ label, trigger, items, align = "end", className }: MenuProps) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const enabled = items.filter((i) => !i.disabled);

  const focusItem = (n: number) => {
    const els = list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
    if (els?.length) els[(n + els.length) % els.length]?.focus();
  };

  useEffect(() => {
    if (!open) return;
    focusItem(0);
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) btn.current?.focus();
  }

  function onListKey(e: React.KeyboardEvent) {
    const els = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(i + 1);
    }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(i - 1);
    }
    else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    }
    else if (e.key === "End") {
      e.preventDefault();
      focusItem(-1);
    }
    else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    else if (e.key === "Tab") close(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const k = e.key.toLowerCase();
      const hit = enabled.findIndex((it, n) => n > i && it.label.toLowerCase().startsWith(k));
      focusItem(hit >= 0 ? hit : enabled.findIndex((it) => it.label.toLowerCase().startsWith(k)));
    }
  }

  return (
    <div ref={wrap} className={cn("relative inline-block", className)}>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${uid}-menu`}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
        }}
        className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-2 rounded-nv-sm px-3 text-nv-ivory-200 hover:bg-nv-graphite-800 hover:text-nv-ivory-50"
      >
        {trigger}
      </button>
      <div
        ref={list}
        id={`${uid}-menu`}
        role="menu"
        aria-label={label}
        hidden={!open}
        onKeyDown={onListKey}
        className={cn(
          "absolute top-full z-30 mt-1 min-w-52 rounded-nv-md bg-nv-graphite-800 py-1 shadow-nv-popover",
          align === "end" ? "right-0" : "left-0",
        )}
      >
        {items.map((it) => {
          const cls = cn(
            "flex min-h-11 w-full cursor-pointer items-center gap-3 px-3 text-left text-nv-body",
            "focus:bg-nv-graphite-700 focus:outline-none hover:bg-nv-graphite-700",
            it.danger ? "text-nv-danger" : "text-nv-ivory-100",
            it.disabled && "cursor-not-allowed opacity-45",
          );
          const common = {
            role: "menuitem" as const,
            tabIndex: -1,
            "aria-disabled": it.disabled || undefined,
            className: cls,
          };
          const inner = (
            <>
              {it.icon && <span aria-hidden>{it.icon}</span>}
              {it.label}
            </>
          );
          return it.href && !it.disabled ? (
            <a key={it.id} href={it.href} {...common} onClick={() => close(false)}>
              {inner}
            </a>
          ) : (
            <button
              key={it.id}
              type="button"
              {...common}
              onClick={() => {
                if (it.disabled) return;
                it.onSelect?.();
                close();
              }}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
