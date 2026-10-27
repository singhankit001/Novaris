"use client";

import { useRef, type RefObject } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";
import { cn } from "@/components/nv/cn";
import { useElementHeight } from "./hooks";

/** Vertical rail that fills as `target` scrolls through the viewport; the parent must be `relative`. Reduced motion shows it fully filled with no moving head. */
export function ScrollRail({ target, head = true, className }: { target: RefObject<HTMLElement | null>; head?: boolean; className?: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const height = useElementHeight(railRef);
  const { scrollYProgress } = useScroll({ target, offset: ["start 70%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const headY = useTransform(progress, (v) => v * height);

  return (
    <div ref={railRef} aria-hidden className={cn("pointer-events-none absolute inset-y-0 w-0.5 rounded-full bg-nv-graphite-700", className)}>
      <motion.div
        className="absolute inset-0 origin-top rounded-full bg-[linear-gradient(180deg,#2f54ff,#7a4dff_60%,#19b6e6)]"
        style={{ scaleY: reduce ? 1 : progress }}
      />
      {head && !reduce ? (
        <motion.span
          className="absolute left-1/2 top-0 -ml-[5px] -mt-[5px] size-2.5 rounded-full border-2 border-nv-copper-400 bg-white shadow-nv-xs"
          style={{ y: headY }}
        />
      ) : null}
    </div>
  );
}
