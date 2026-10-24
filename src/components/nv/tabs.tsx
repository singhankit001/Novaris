"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
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

/**
 * WAI-ARIA tabs as a segmented control: a white thumb glides between segments (shared layoutId).
 * Automatic activation, roving tabindex, wrapping arrows, Home/End.
 */
export function Tabs({ items, label, defaultId, className }: TabsProps) {
  const uid = useId();
  const reduce = useReducedMotion();
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
      <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
        <div
          role="tablist"
          aria-label={label}
          className="inline-flex gap-1 rounded-nv-md bg-nv-graphite-850 p-1 shadow-[inset_0_1px_2px_rgb(21_23_29/0.07)]"
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
                  "relative inline-flex min-h-10 shrink-0 touch-manipulation items-center gap-2 rounded-[10px] px-4 text-nv-body font-medium transition-colors duration-150",
                  "disabled:cursor-not-allowed disabled:opacity-45",
                  selected ? "text-nv-ivory-50" : "text-nv-ivory-300 hover:text-nv-ivory-100",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId={`${uid}-thumb`}
                    aria-hidden
                    transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0 }}
                    className="absolute inset-0 rounded-[10px] bg-white shadow-[0_1px_0_rgb(255_255_255)_inset,0_1px_3px_rgb(21_23_29/0.12),0_0_0_1px_rgb(21_23_29/0.05)]"
                  />
                )}
                <span className="relative">{t.label}</span>
                {t.count !== undefined && (
                  <span className={cn("nv-num relative rounded-full px-1.5 text-nv-micro", selected ? "bg-nv-copper-wash text-nv-copper-400" : "text-nv-ivory-300")}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${uid}-panel-${t.id}`}
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={t.id !== current}
          tabIndex={0}
          className="pt-5"
        >
          {t.id === current && t.panel}
        </div>
      ))}
    </div>
  );
}
