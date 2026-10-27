"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/components/nv/cn";
import { fitCanvas, visibleLoop } from "./shared";

/**
 * CubesGrid: canvas2D field of isometric cubes that rise and tint blue near the pointer.
 * Fills its positioned parent, decorative (aria-hidden, pointer-events none; it listens on window
 * so content above stays clickable). Props: cell (px, default 44), reach (px, default 170), className.
 * Renders on demand: the loop idles once every cube has settled; reduced motion draws one still frame.
 */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (c1: number[], c2: number[], t: number) =>
  `rgb(${lerp(c1[0] ?? 0, c2[0] ?? 0, t) | 0},${lerp(c1[1] ?? 0, c2[1] ?? 0, t) | 0},${lerp(c1[2] ?? 0, c2[2] ?? 0, t) | 0})`;

const TOP = [255, 255, 255];
const TOP_HOT = [214, 223, 255];
const LEFT = [230, 232, 238];
const LEFT_HOT = [150, 170, 255];
const RIGHT = [213, 216, 224];
const RIGHT_HOT = [110, 136, 255];

export function CubesGrid({ cell = 44, reach = 170, className }: { cell?: number; reach?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let size = fitCanvas(canvas);
    let cols = 0;
    let rows = 0;
    let lift = new Float32Array(0);
    const pointer = { x: -9999, y: -9999 };
    const rowH = cell * 0.5;

    const layout = () => {
      size = fitCanvas(canvas);
      if (!size) return;
      cols = Math.ceil(size.w / cell) + 2;
      rows = Math.ceil(size.h / rowH) + 4;
      lift = new Float32Array(cols * rows);
    };

    const draw = () => {
      if (!size) return;
      const { ctx, w, h } = size;
      ctx.clearRect(0, 0, w, h);
      const half = cell / 2;
      const quarter = cell / 4;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const l = lift[r * cols + c] ?? 0;
          const cx = (c - 1 + (r & 1) * 0.5) * cell + half;
          const cy = r * rowH - cell;
          const z = 6 + l * 18;
          const top = cy - z;
          const gap = 2;
          ctx.fillStyle = mix(LEFT, LEFT_HOT, l);
          ctx.beginPath();
          ctx.moveTo(cx - half + gap, top + quarter);
          ctx.lineTo(cx, top + half - gap / 2);
          ctx.lineTo(cx, top + half - gap / 2 + z);
          ctx.lineTo(cx - half + gap, top + quarter + z);
          ctx.fill();
          ctx.fillStyle = mix(RIGHT, RIGHT_HOT, l);
          ctx.beginPath();
          ctx.moveTo(cx + half - gap, top + quarter);
          ctx.lineTo(cx, top + half - gap / 2);
          ctx.lineTo(cx, top + half - gap / 2 + z);
          ctx.lineTo(cx + half - gap, top + quarter + z);
          ctx.fill();
          ctx.fillStyle = mix(TOP, TOP_HOT, l);
          ctx.beginPath();
          ctx.moveTo(cx, top + gap / 2);
          ctx.lineTo(cx + half - gap, top + quarter);
          ctx.lineTo(cx, top + half - gap / 2);
          ctx.lineTo(cx - half + gap, top + quarter);
          ctx.fill();
        }
      }
    };

    const step = () => {
      if (!size) return false;
      const rect = canvas.getBoundingClientRect();
      const px = pointer.x - rect.left;
      const py = pointer.y - rect.top;
      let moving = false;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const cx = (c - 1 + (r & 1) * 0.5) * cell + cell / 2;
          const cy = r * rowH - cell + cell / 2;
          const d = Math.hypot(cx - px, cy - py);
          const target = Math.max(0, 1 - d / reach) ** 2;
          const cur = lift[i] ?? 0;
          const next = cur + (target - cur) * 0.14;
          if (Math.abs(next - cur) > 0.002) moving = true;
          lift[i] = Math.abs(target - next) < 0.003 ? target : next;
        }
      }
      draw();
      return moving ? undefined : false;
    };

    layout();
    draw();
    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(canvas);
    if (reduced) return () => ro.disconnect();

    const loop = visibleLoop(canvas, step);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      loop.wake();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      loop.stop();
      ro.disconnect();
    };
  }, [cell, reach, reduced]);

  return <canvas ref={ref} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
