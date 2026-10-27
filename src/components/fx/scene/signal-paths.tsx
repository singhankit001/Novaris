"use client";

import { type ReactNode, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/components/nv/cn";

/**
 * SignalPaths: scroll-linked SVG paths that draw in from labelled inputs and converge into one
 * result. Original take on a scroll-driven "signal" effect; plain flow layout (no sticky, no scroll
 * hijack). Props: inputs (labels along the top edge, 3-6), children (the converged result chip).
 * Reduced motion shows the finished drawing. SVG is decorative; labels are real text.
 */
const W = 800;
const H = 420;
const TARGET: [number, number] = [400, 360];
const COLORS = ["var(--nv-copper-400)", "var(--nv-violet-400)", "var(--nv-ion-400)", "var(--nv-data-4)", "var(--nv-copper-400)", "var(--nv-violet-400)"];

function pathFor(x: number): string {
  const [tx, ty] = TARGET;
  return `M ${x} 56 C ${x} 190, ${tx + (x - tx) * 0.15} 190, ${tx} ${ty}`;
}

export function SignalPaths({ inputs, children, className }: { inputs: string[]; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  const labelOpacity = useTransform(scrollYProgress, [0.75, 1], [0.35, 1]);
  const xs = inputs.map((_, i) => Math.round(((i + 0.5) / inputs.length) * (W - 160) + 80));

  return (
    <div ref={ref} className={cn("relative mx-auto aspect-[800/420] w-full max-w-4xl", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        {xs.map((x) => (
          <path key={`b${x}`} d={pathFor(x)} stroke="var(--nv-hairline)" strokeWidth={1.5} />
        ))}
        {xs.map((x, i) => (
          <PathLine key={x} d={pathFor(x)} color={COLORS[i % COLORS.length] ?? "currentColor"} progress={scrollYProgress} index={i} reduced={!!reduced} />
        ))}
        {xs.map((x) => (
          <circle key={`d${x}`} cx={x} cy={56} r={4} fill="var(--nv-surface)" stroke="var(--nv-border-strong)" />
        ))}
      </svg>
      <span className="sr-only">Inputs: {inputs.join(", ")}</span>
      {inputs.map((label, i) => (
        <span
          key={label}
          className="nv-eyebrow absolute hidden -translate-x-1/2 whitespace-nowrap text-[11px] sm:block"
          style={{ left: `${((xs[i] ?? 0) / W) * 100}%`, top: 0 }}
        >
          {label}
        </span>
      ))}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ top: `${(TARGET[1] / H) * 100}%`, opacity: reduced ? 1 : labelOpacity }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function PathLine({ d, color, progress, index, reduced }: { d: string; color: string; progress: ReturnType<typeof useScroll>["scrollYProgress"]; index: number; reduced: boolean }) {
  const length = useTransform(progress, [0.05 + index * 0.04, 0.8], [0, 1]);
  return <motion.path d={d} stroke={color} strokeWidth={2} strokeLinecap="round" style={{ pathLength: reduced ? 1 : length }} />;
}
