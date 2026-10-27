"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";

/**
 * Counts up to a real value once it scrolls into view, and re-tweens when the value changes.
 * The server and reduced-motion render show the final number; the final number is also the only
 * text assistive tech reads.
 */
export default function CountUp({ value, duration = 900, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const [n, setN] = useState(value);
  const cur = useRef(value);
  const began = useRef(false);

  useEffect(() => {
    if (reduce || !inView) return;
    const from = began.current ? cur.current : 0;
    began.current = true;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const v = Math.round(from + (value - from) * (1 - (1 - p) ** 3));
      cur.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, inView, reduce, duration]);

  const shown = reduce || !inView ? value : n;
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value.toLocaleString("en-US")}</span>
      <span aria-hidden>{shown.toLocaleString("en-US")}</span>
    </span>
  );
}
