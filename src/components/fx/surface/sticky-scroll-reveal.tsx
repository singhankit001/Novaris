"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/nv/cn";

export interface StickyStep {
  id: string;
  title: string;
  body: string;
  /** Decorative supporting visual; the text must carry every fact. */
  visual: ReactNode;
}

/** Steps scroll on the left while a pinned panel on the right swaps to the active step's visual (lg+). Below lg every step stacks with its visual inline. Uses native sticky, so scroll is never trapped. */
export function StickyScrollReveal({ steps, className }: { steps: StickyStep[]; className?: string }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of refs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [steps.length]);

  return (
    <div className={cn("grid gap-10 lg:grid-cols-2 lg:gap-16", className)}>
      <ol>
        {steps.map((s, i) => (
          <li
            key={s.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-index={i}
            className="flex flex-col justify-center gap-5 py-8 lg:min-h-[70vh]"
          >
            <div className={cn("transition-opacity duration-300 ease-nv-out motion-reduce:transition-none", i === active ? "lg:opacity-100" : "lg:opacity-55")}>
              <p className="nv-eyebrow nv-num">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-nv-display-md font-semibold tracking-[-0.03em] text-nv-ivory-100 text-balance">{s.title}</h3>
              <p className="mt-3 max-w-prose text-nv-lead text-nv-ivory-200 text-pretty">{s.body}</p>
            </div>
            <div aria-hidden className="lg:hidden">
              {s.visual}
            </div>
          </li>
        ))}
      </ol>
      <div aria-hidden className="hidden lg:block">
        <div className="sticky top-28 h-[min(20rem,70vh)]">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "absolute inset-0 transition-[opacity,transform] duration-500 ease-nv-out motion-reduce:transition-opacity",
                i === active ? "opacity-100" : "translate-y-3 opacity-0 motion-reduce:translate-y-0",
              )}
            >
              {s.visual}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
