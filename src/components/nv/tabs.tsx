"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
  panel: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  label: string;
  defaultId?: string;
  className?: string;
}

/** WAI-ARIA tabs, automatic activation, roving tabindex, wrapping arrows, Home/End. */
export function Tabs({ items, label, defaultId, className }: TabsProps) {
  const uid = useId();
  const enabled = items.filter((t) => !t.disabled);
  const [current, setCurrent] = useState(defaultId ?? enabled[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function move(from: string, delta: number | "start" | "end") {
    const idx = enabled.findIndex((t) => t.id === from);
    const next =
      delta === "start" ? 0 : delta === "end" ? enabled.length - 1 : (idx + delta + enabled.length) % enabled.length;
    const target = enabled[next];
    if (!target) return;
    setCurrent(target.id);
    refs.current[target.id]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, id: string) {
    const map: Record<string, number | "start" | "end"> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      Home: "start",
      End: "end",
    };
    const d = map[e.key];
    if (d === undefined) return;
    e.preventDefault();
    move(id, d);
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-nv-graphite-700 [scrollbar-width:none]"
      >
        {items.map((t) => {
          const selected = t.id === current;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              role="tab"
              type="button"
              id={`${uid}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={t.disabled}
              onClick={() => setCurrent(t.id)}
              onKeyDown={(e) => onKeyDown(e, t.id)}
              className={cn(
                "-mb-px inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-2 border-b-2 px-3 text-nv-body transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-45",
                selected
                  ? "border-nv-copper-400 text-nv-ivory-50"
                  : "border-transparent text-nv-ivory-300 hover:text-nv-ivory-100",
              )}
            >
              {t.label}
              {t.count !== undefined && <span className="nv-num text-nv-micro text-nv-ivory-300">{t.count}</span>}
            </button>
          );
        })}
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${uid}-panel-${t.id}`}
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={t.id !== current}
          tabIndex={0}
          className="pt-4"
        >
          {t.id === current && t.panel}
        </div>
      ))}
    </div>
  );
}
