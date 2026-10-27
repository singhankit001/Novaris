"use client";

import { useEffect, useId, useState, type RefObject } from "react";
import { motion, useInView } from "framer-motion";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";

/**
 * SVG beam between two DOM nodes inside `containerRef` (which must be position: relative).
 * Re-measures with ResizeObserver; the gradient pulse (blue to violet) travels from -> to, or back with `reverse`.
 * Pauses off-screen; with reduced motion draws one static gradient line. Decorative: aria-hidden.
 */
export interface AnimatedBeamProps {
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  /** Pixels the curve bows upward (negative bows down). Default 0 = straight. */
  curvature?: number;
  reverse?: boolean;
  /** Seconds per pass. */
  duration?: number;
  delay?: number;
}

interface Geo {
  w: number;
  h: number;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function AnimatedBeam({ containerRef, fromRef, toRef, curvature = 0, reverse = false, duration = 3, delay = 0 }: AnimatedBeamProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const inView = useInView(containerRef as RefObject<Element>, { amount: 0.1 });
  const [geo, setGeo] = useState<Geo | null>(null);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const measure = () => {
      const a = fromRef.current?.getBoundingClientRect();
      const b = toRef.current?.getBoundingClientRect();
      const o = c.getBoundingClientRect();
      if (!a || !b) return;
      const x1 = a.left - o.left + a.width / 2;
      const y1 = a.top - o.top + a.height / 2;
      const x2 = b.left - o.left + b.width / 2;
      const y2 = b.top - o.top + b.height / 2;
      const [sx, sy, ex, ey] = reverse ? [x2, y2, x1, y1] : [x1, y1, x2, y2];
      setGeo({ w: o.width, h: o.height, d: `M${sx},${sy} Q${(sx + ex) / 2},${(sy + ey) / 2 - curvature} ${ex},${ey}`, x1: sx, y1: sy, x2: ex, y2: ey });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    if (fromRef.current) ro.observe(fromRef.current);
    if (toRef.current) ro.observe(toRef.current);
    return () => ro.disconnect();
  }, [containerRef, fromRef, toRef, curvature, reverse]);

  if (!geo) return null;
  const gid = `beam${id.replace(/:/g, "")}`;
  return (
    <svg aria-hidden width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} className="pointer-events-none absolute left-0 top-0">
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={geo.x1} y1={geo.y1} x2={geo.x2} y2={geo.y2}>
          <stop offset="0" stopColor="var(--nv-copper-400)" />
          <stop offset="1" stopColor="var(--nv-violet-400)" />
        </linearGradient>
      </defs>
      <path d={geo.d} fill="none" stroke="var(--nv-graphite-600)" strokeWidth={1.5} strokeLinecap="round" />
      {reduce ? (
        <path d={geo.d} fill="none" stroke={`url(#${gid})`} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      ) : inView ? (
        <motion.path
          d={geo.d}
          pathLength={1}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="0.2 1"
          initial={{ strokeDashoffset: 0.2 }}
          animate={{ strokeDashoffset: -1 }}
          transition={{ duration, delay, ease: "linear", repeat: Infinity }}
        />
      ) : null}
    </svg>
  );
}
