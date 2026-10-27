"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";
import { cn } from "@/components/nv/cn";
import { ScrollRail } from "./scroll-rail";

export interface TimelineEntry {
  id: string;
  /** Short date or phase label shown in the sticky column. */
  label: string;
  title: string;
  content: ReactNode;
}

function Node({ entry }: { entry: TimelineEntry }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e && (e.isIntersecting || e.boundingClientRect.top < 0)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -45% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const lit = seen || Boolean(reduce);

  return (
    <li ref={ref} className="relative pb-14 pl-10 last:pb-0 md:flex md:gap-10">
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1.5 size-4 rounded-full border-2 bg-white transition-colors duration-300 motion-reduce:transition-none",
          lit ? "border-nv-copper-400 bg-nv-copper-wash" : "border-nv-graphite-600",
        )}
      />
      <div className="md:sticky md:top-24 md:h-fit md:w-44 md:shrink-0">
        <p className="nv-eyebrow">{entry.label}</p>
        <h3 className="mt-1 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100 text-balance">{entry.title}</h3>
      </div>
      <div className="mt-3 text-nv-body leading-relaxed text-nv-ivory-200 md:mt-0 md:flex-1">{entry.content}</div>
    </li>
  );
}

/** Dated milestones along a scroll-filled rail; labels stick on desktop, nodes light as they are reached. All text is visible without motion. */
export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  return (
    <ol ref={ref} className={cn("relative", className)}>
      <ScrollRail target={ref} head={false} className="left-[7px]" />
      {entries.map((e) => (
        <Node key={e.id} entry={e} />
      ))}
    </ol>
  );
}
