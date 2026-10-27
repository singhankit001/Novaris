"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";
import { cn } from "@/components/nv/cn";
import { fitCanvas, useFinePointer, visibleLoop } from "./shared";

/**
 * CanvasReveal: canvas2D dot-matrix that expands outward from the card centre when the card is
 * hovered (fine pointers), focused (keyboard), or `active` is set (e.g. a stage is current).
 * Content stays above the canvas; the dots are decorative (aria-hidden). Props: active, rgb
 * ([r,g,b], default electric blue), dot (px), gap (px), className.
 * Canvas is idle (no RAF) once the reveal settles; reduced motion jumps straight to the end state.
 */
const BLUE: [number, number, number] = [47, 84, 255];

export function CanvasReveal({
  children,
  active = false,
  rgb = BLUE,
  dot = 1.6,
  gap = 7,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  rgb?: [number, number, number];
  dot?: number;
  gap?: number;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [engaged, setEngaged] = useState(false);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const on = active || engaged;
  const onRef = useRef(on);
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onRef.current = on;
    wakeRef.current?.();
  }, [on]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let size = fitCanvas(cv);
    let progress = onRef.current && reduced ? 1 : 0;
    const [r, g, b] = rgb;

    const draw = () => {
      if (!size) return;
      const { ctx, w, h } = size;
      ctx.clearRect(0, 0, w, h);
      if (progress <= 0.001) return;
      const maxD = Math.hypot(w / 2, h / 2);
      const front = progress * (maxD + 60);
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          const d = Math.hypot(x - w / 2, y - h / 2);
          // deterministic per-dot jitter, no RNG
          const jitter = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
          const a = Math.min(1, Math.max(0, (front - d) / 60)) * (0.18 + Math.abs(jitter) * 0.5);
          if (a < 0.02) continue;
          ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`;
          ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
        }
      }
    };
    const ro = new ResizeObserver(() => {
      size = fitCanvas(cv);
      draw();
    });
    ro.observe(cv);
    draw();

    if (reduced) {
      wakeRef.current = () => {
        progress = onRef.current ? 1 : 0;
        draw();
      };
      wakeRef.current();
      return () => {
        wakeRef.current = null;
        ro.disconnect();
      };
    }
    const loop = visibleLoop(cv, () => {
      const target = onRef.current ? 1 : 0;
      progress += (target - progress) * 0.1;
      if (Math.abs(target - progress) < 0.004) progress = target;
      draw();
      return progress === target ? false : undefined;
    });
    wakeRef.current = loop.wake;
    return () => {
      wakeRef.current = null;
      loop.stop();
      ro.disconnect();
    };
  }, [rgb, dot, gap, reduced]);

  return (
    <div
      ref={wrap}
      className={cn("relative overflow-hidden", className)}
      onPointerEnter={() => fine && setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setEngaged(false);
      }}
    >
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative">{children}</div>
    </div>
  );
}
