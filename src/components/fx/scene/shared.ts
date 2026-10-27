"use client";

import { type RefObject, useEffect, useState, useSyncExternalStore } from "react";

/** Deterministic PRNG (mulberry32). Never use Math.random in render. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True while the element is within `margin` of the viewport (stays true after first sight when `once`). */
export function useInViewport<T extends Element>(ref: RefObject<T | null>, margin = "200px", once = false): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        setSeen(e.isIntersecting);
        if (once && e.isIntersecting) io.disconnect();
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, once]);
  return seen;
}

/** Subscribes to a media query; `server` is the SSR/hydration value. */
export function useMedia(query: string, server = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => server,
  );
}

/** Hover tilt is allowed only on fine, hover-capable pointers. */
export function useFinePointer(): boolean {
  return useMedia("(hover: hover) and (pointer: fine)");
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface LoopHandle {
  /** Resume rendering after the step function returned false (render on demand). */
  wake(): void;
  stop(): void;
}

/**
 * RAF loop that only runs while `el` is in the viewport and the tab is visible.
 * `step` returns false to go idle until `wake()` is called.
 */
export function visibleLoop(el: Element, step: (t: number) => boolean | void, margin = "100px"): LoopHandle {
  let raf = 0;
  let inView = false;
  let want = true;
  const tick = (t: number) => {
    raf = 0;
    if (!inView || document.hidden || !want) return;
    if (step(t) === false) {
      want = false;
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const go = () => {
    if (!raf && inView && !document.hidden && want) raf = requestAnimationFrame(tick);
  };
  const cancel = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const io = new IntersectionObserver(
    ([e]) => {
      inView = !!e?.isIntersecting;
      if (inView) go();
      else cancel();
    },
    { rootMargin: margin },
  );
  io.observe(el);
  const vis = () => (document.hidden ? cancel() : go());
  document.addEventListener("visibilitychange", vis);
  return {
    wake() {
      want = true;
      go();
    },
    stop() {
      cancel();
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    },
  };
}

/** Size a canvas to its CSS box at DPR <= 2; returns the 2D context and CSS size. */
export function fitCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
