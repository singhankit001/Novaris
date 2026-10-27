"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";
import { cn } from "@/components/nv/cn";
import { useFinePointer } from "./hooks";

/** Card that tilts toward the pointer (max `tilt` degrees) with a moving light sheen. Static on touch and reduced motion. */
export function CometCard({ children, className, tilt = 7 }: { children: ReactNode; className?: string; tilt?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const live = fine && !reduce;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 220, damping: 24 });
  const sy = useSpring(py, { stiffness: 220, damping: 24 });
  const rotateY = useTransform(sx, [0, 1], [-tilt, tilt]);
  const rotateX = useTransform(sy, [0, 1], [tilt, -tilt]);
  const glowX = useTransform(sx, (v) => `${v * 100}%`);
  const glowY = useTransform(sy, (v) => `${v * 100}%`);
  const sheen = useMotionTemplate`radial-gradient(420px circle at ${glowX} ${glowY}, rgb(255 255 255 / 0.85), rgb(122 77 255 / 0.10) 38%, transparent 62%)`;
  const edge = useMotionTemplate`radial-gradient(260px circle at ${glowX} ${glowY}, rgb(47 84 255 / 0.28), transparent 70%)`;

  return (
    <div className={cn("[perspective:900px]", className)}>
      <motion.div
        ref={ref}
        onPointerMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!live || !r || e.pointerType === "touch") return;
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
        style={live ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        className="group/comet nv-card relative overflow-hidden"
      >
        {live ? (
          <>
            <motion.span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/comet:opacity-100" style={{ backgroundImage: edge }} />
            <motion.span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover/comet:opacity-100" style={{ backgroundImage: sheen }} />
          </>
        ) : null}
        <div className="relative">{children}</div>
      </motion.div>
    </div>
  );
}
