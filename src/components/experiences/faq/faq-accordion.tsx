"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/components/nv/cn";

interface Item {
  question: string;
  answer: string;
}

/**
 * Accessible accordion. Every answer stays in the DOM (collapsed rows are inert, not removed),
 * so crawlers and find-in-page see all content. Arrow/Home/End move between headers.
 */
export function FaqAccordion({ items }: { items: Item[] }) {
  const uid = useId();
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const allOpen = open.size === items.length;

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = items.length - 1;
    const to = e.key === "ArrowDown" ? (i === last ? 0 : i + 1) : e.key === "ArrowUp" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (to < 0) return;
    e.preventDefault();
    btns.current[to]?.focus();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="nv-eyebrow">{items.length} questions</p>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(items.map((_, i) => i)))}
          className="min-h-11 rounded-full px-4 text-nv-small font-medium text-nv-copper-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <ol className="m-0 list-none border-t border-nv-graphite-700 p-0">
        {items.map((item, i) => {
          const isOpen = open.has(i);
          const btnId = `${uid}-b${i}`;
          const panelId = `${uid}-p${i}`;
          return (
            <li key={item.question} className="border-b border-nv-graphite-700">
              <h2 className="m-0">
                <button
                  id={btnId}
                  ref={(el) => {
                    btns.current[i] = el;
                  }}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  className="group flex min-h-16 w-full items-start gap-4 py-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 sm:gap-6"
                >
                  <span aria-hidden className="nv-num w-8 shrink-0 pt-1 font-nv-mono text-nv-micro text-nv-copper-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100 text-balance">{item.question}</span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "mt-1 size-5 shrink-0 text-nv-graphite-400 transition-transform duration-200 ease-nv-out motion-reduce:transition-none",
                      isOpen && "rotate-180 text-nv-copper-400",
                    )}
                  />
                </button>
              </h2>
              <div
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                inert={!isOpen}
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-nv-out motion-reduce:transition-none",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <p className="m-0 max-w-[62ch] pb-7 pl-12 text-nv-body leading-[1.7] text-nv-ivory-200 text-pretty sm:pl-14">{item.answer}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
