"use client";

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/components/nv/cn";
import { useFinePointer } from "./hooks";
import { RING_MASK } from "./ring-mask";

/** Wraps a card; a blue-to-violet arc of light travels its 1.5px border toward the pointer, and rings it on keyboard focus. Match `className` radius to the child's. */
export function GlowingBorder({ children, className, spread = 70 }: { children: ReactNode; className?: string; spread?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const live = fine && !reduce;

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.setProperty("--gb-a", `${(Math.atan2(dy, dx) * 180) / Math.PI + 90}deg`);
    el.style.setProperty("--gb-o", "1");
  };
  const leave = () => ref.current?.style.setProperty("--gb-o", "0");

  return (
    <div
      ref={ref}
      onPointerMove={live ? move : undefined}
      onPointerLeave={live ? leave : undefined}
      className={cn("group/glow relative rounded-nv-lg", className)}
      style={{ "--gb-a": "0deg", "--gb-o": 0 } as CSSProperties}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-[var(--gb-o)] transition-opacity duration-300 ease-nv-out group-focus-within/glow:opacity-100 motion-reduce:transition-none"
        style={{
          ...RING_MASK,
          padding: 1.5,
          background: `conic-gradient(from calc(var(--gb-a) - ${spread / 2}deg), transparent 0deg, #2f54ff ${spread * 0.4}deg, #7a4dff ${spread * 0.7}deg, transparent ${spread}deg, transparent 360deg)`,
        }}
      />
      {children}
    </div>
  );
}
