"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/components/nv/cn";
import { fitCanvas, mulberry32, visibleLoop } from "./shared";

/**
 * Particles3D: very low density pseudo-3D dust (canvas2D, no WebGL needed). Slow rotation about Y,
 * upward buoyant drift, depth-scaled size/alpha. Absolutely positioned, decorative, pointer-events none.
 * Props: quantity (default 48, 40% on narrow screens), seed, className.
 * Runs only while visible; reduced motion draws one still frame.
 */
const COLORS: [number, number, number][] = [
  [47, 84, 255],
  [122, 77, 255],
  [134, 139, 153],
];

export function Particles3D({ quantity = 48, seed = 7, className }: { quantity?: number; seed?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rnd = mulberry32(seed);
    const n = window.innerWidth < 640 ? Math.ceil(quantity * 0.4) : quantity;
    const pts = Array.from({ length: n }, () => ({
      x: rnd() * 2 - 1,
      y: rnd() * 2 - 1,
      z: rnd() * 2 - 1,
      r: 1 + rnd() * 2.2,
      c: COLORS[Math.floor(rnd() * COLORS.length)] ?? [47, 84, 255],
      v: 0.00004 + rnd() * 0.00007,
    }));
    let size = fitCanvas(canvas);
    let angle = 0;
    let last = 0;

    const draw = () => {
      if (!size) return;
      const { ctx, w, h } = size;
      ctx.clearRect(0, 0, w, h);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      for (const p of pts) {
        const rx = p.x * cos - p.z * sin;
        const rz = p.x * sin + p.z * cos;
        const k = 1 / (1.8 - rz * 0.6);
        const a = 0.1 + (rz + 1) * 0.12;
        ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(w / 2 + rx * k * w * 0.62, h / 2 + p.y * k * h * 0.62, p.r * k, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const ro = new ResizeObserver(() => {
      size = fitCanvas(canvas);
      draw();
    });
    ro.observe(canvas);
    draw();
    if (reduced) return () => ro.disconnect();

    const loop = visibleLoop(canvas, (t) => {
      const dt = last ? Math.min(t - last, 50) : 16;
      last = t;
      angle += dt * 0.00006;
      for (const p of pts) {
        p.y -= dt * p.v;
        if (p.y < -1) p.y = 1;
      }
      draw();
    });
    return () => {
      loop.stop();
      ro.disconnect();
    };
  }, [quantity, seed, reduced]);

  return <canvas ref={ref} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
