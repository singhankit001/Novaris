"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/components/nv/cn";

export interface ExpandableItem {
  id: string;
  eyebrow?: string;
  title: string;
  summary: string;
  /** Revealed on expand. Rendered inert while collapsed so hidden controls are not focusable. */
  detail: ReactNode;
}

function Card({ item }: { item: ExpandableItem }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelId = `${uid}-panel`;
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      document.getElementById(`${uid}-btn`)?.focus();
    }
  };

  return (
    <article onKeyDown={onKey} className={cn("nv-card overflow-hidden transition-[box-shadow,border-color] duration-200 motion-reduce:transition-none", open && "border-nv-copper-700 shadow-nv-lift")}>
      <h3>
        <button
          id={`${uid}-btn`}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-start justify-between gap-4 p-5 text-left"
        >
          <span className="min-w-0">
            {item.eyebrow ? <span className="nv-eyebrow block">{item.eyebrow}</span> : null}
            <span className="mt-1 block text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">{item.title}</span>
            <span className="mt-1.5 block text-nv-small leading-relaxed text-nv-ivory-300">{item.summary}</span>
          </span>
          <ChevronDown aria-hidden className={cn("mt-1 size-5 shrink-0 text-nv-graphite-400 transition-transform duration-200 ease-nv-out motion-reduce:transition-none", open && "rotate-180 text-nv-copper-400")} />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${uid}-btn`}
        inert={!open}
        className={cn("grid transition-[grid-template-rows] duration-300 ease-nv-out motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="overflow-hidden">
          <div className="border-t border-nv-graphite-700 px-5 pb-5 pt-4 text-nv-small leading-relaxed text-nv-ivory-200">{item.detail}</div>
        </div>
      </div>
    </article>
  );
}

/** Cards that expand in place as disclosures (aria-expanded, region, Escape collapses and returns focus to the header). */
export function ExpandableCards({ items, className }: { items: ExpandableItem[]; className?: string }) {
  return (
    <div className={cn("grid items-start gap-4 md:grid-cols-2", className)}>
      {items.map((item) => (
        <Card key={item.id} item={item} />
      ))}
    </div>
  );
}
