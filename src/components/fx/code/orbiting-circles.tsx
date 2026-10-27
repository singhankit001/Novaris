"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/components/nv/cn";

export interface OrbitItem {
  id: string;
  /** Accessible name; also the tooltip. */
  label: string;
  icon: ReactNode;
}

/**
 * Items evenly spaced on a ring, rotating with a CSS transform animation while on screen.
 * Fills its square parent (parent must be `relative`); `scale` shrinks the ring so several can nest.
 * Items stay upright (counter-rotation). Reduced motion: static ring. Sized in percent, so it works at 360px.
 */
export interface OrbitingCirclesProps {
  items: OrbitItem[];
  /** Seconds per revolution. */
  duration?: number;
  reverse?: boolean;
  /** 0-1 ring size relative to the parent. */
  scale?: number;
  className?: string;
}

export function OrbitingCircles({ items, duration = 40, reverse = false, scale = 1, className }: OrbitingCirclesProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { amount: 0.1 });
  // `animate-spin` supplies the @keyframes; inline style sets speed, direction and pause state.
  const spinStyle = (rev: boolean): CSSProperties => ({
    animationDuration: `${duration}s`,
    animationDirection: rev ? "reverse" : "normal",
    animationPlayState: inView ? "running" : "paused",
  });
  const spinCls = reduce ? "" : "animate-spin";
  return (
    <ul
      ref={ref}
      aria-label="Orbiting items"
      style={{ width: `${scale * 100}%`, ...spinStyle(reverse) }}
      className={cn(spinCls, "absolute left-1/2 top-1/2 m-0 aspect-square -translate-x-1/2 -translate-y-1/2 list-none rounded-full border border-dashed border-nv-graphite-600 p-0", className)}
    >
      {items.map((it, i) => {
        const angle = (360 / items.length) * i;
        return (
          <li key={it.id} style={{ transform: `rotate(${angle}deg)` }} className="absolute inset-0 m-0 flex list-none items-center justify-end">
            <span style={spinStyle(!reverse)} className={cn(spinCls, "block translate-x-1/2")}>
              <span style={{ transform: `rotate(${-angle}deg)` }} className="flex size-11 items-center justify-center rounded-full border border-nv-graphite-700 bg-white text-nv-ivory-200 shadow-nv-card" title={it.label}>
                <span aria-hidden className="flex size-5 items-center justify-center">{it.icon}</span>
                <span className="sr-only">{it.label}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
