"use client";

import { useEffect, useRef } from "react";
import s from "./landing.module.css";

interface Ray {
  angle: number; // radians from vertical
  len: number; // 0..1 of max length
  alpha: number;
  tone: number; // 0 blue .. 1 violet
  dot: number;
  phase: number;
  // spring state for the tip displacement
  ox: number;
  oy: number;
  vx: number;
  vy: number;
}

const COUNT = 300;

/** Deterministic pseudo-random so the first frame is stable across renders. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRays(): Ray[] {
  const r = rng(7);
  return Array.from({ length: COUNT }, (_, i) => {
    const u = (i + r() * 0.8) / COUNT;
    const angle = (u - 0.5) * 2 * 1.32; // about +-75deg
    const edge = Math.abs(angle) / 1.32;
    return {
      angle,
      len: (0.3 + r() * 0.7) * (1 - edge * 0.25),
      alpha: 0.18 + r() * 0.5,
      tone: Math.min(1, Math.max(0, 0.15 + edge * 0.5 + (r() - 0.5) * 0.5)),
      dot: 1.2 + r() * 1.8,
      phase: r() * Math.PI * 2,
      ox: 0, oy: 0, vx: 0, vy: 0,
    };
  });
}

/**
 * Many thin lines fan from one point and each ends in a dot: many files converging on one cited answer.
 * Decorative (aria-hidden); the meaning is stated in the adjacent copy.
 */
export default function SignalBurst() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rays = makeRays();
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fineMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = false;
    let influence = 0;
    let influenceTarget = 0;
    const pointer = { x: 0, y: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    const draw = (now: number) => {
      const t = now / 1000;
      const animated = !reduceMq.matches;
      ctx.clearRect(0, 0, w, h);
      const ox = w / 2;
      const oy = h + 14;
      const maxLen = Math.max(h, w * 0.62);
      const R = Math.max(90, Math.min(w, h) * 0.2);
      influence += (influenceTarget - influence) * 0.08;

      ctx.lineCap = "round";
      for (const ray of rays) {
        const shimmer = animated ? 1 + 0.018 * Math.sin(t * 0.9 + ray.phase) : 1;
        const L = Math.min(ray.len * maxLen, (h * 0.98) / Math.max(0.2, Math.cos(ray.angle))) * shimmer;
        const tx = ox + Math.sin(ray.angle) * L;
        const ty = oy - Math.cos(ray.angle) * L;

        // pointer influence: spring the tip toward the cursor, then let it spring back
        let f = 0;
        if (animated && influence > 0.001) {
          const dx = pointer.x - tx;
          const dy = pointer.y - ty;
          const d = Math.hypot(dx, dy);
          f = Math.exp(-((d / R) ** 2)) * influence;
          ray.vx += (dx * 0.32 * f - ray.ox) * 0.14;
          ray.vy += (dy * 0.32 * f - ray.oy) * 0.14;
        } else {
          ray.vx += -ray.ox * 0.14;
          ray.vy += -ray.oy * 0.14;
        }
        ray.vx *= 0.8;
        ray.vy *= 0.8;
        ray.ox += ray.vx;
        ray.oy += ray.vy;

        const px = tx + ray.ox;
        const py = ty + ray.oy;
        const glow = Math.min(1, f * 1.4 + Math.hypot(ray.ox, ray.oy) / 60);
        const a = Math.min(1, ray.alpha * (animated ? 0.92 + 0.08 * Math.sin(t * 1.3 + ray.phase) : 1) + glow * 0.5);
        const rC = Math.round(47 + (122 - 47) * ray.tone);
        const gC = Math.round(84 + (77 - 84) * ray.tone);
        const bC = 255;

        // control point carries the bend
        const cx = (ox + px) / 2 + ray.ox * 0.5;
        const cy = (oy + py) / 2 + ray.oy * 0.5;
        const grad = ctx.createLinearGradient(ox, oy, px, py);
        grad.addColorStop(0, `rgba(${rC},${gC},${bC},0)`);
        grad.addColorStop(0.55, `rgba(${rC},${gC},${bC},${a * 0.5})`);
        grad.addColorStop(1, `rgba(${rC},${gC},${bC},${a})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.7 + glow * 0.9;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(cx, cy, px, py);
        ctx.stroke();

        ctx.fillStyle = `rgba(${rC},${gC},${bC},${Math.min(1, a + 0.15)})`;
        ctx.beginPath();
        ctx.arc(px, py, ray.dot + glow * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (now: number) => {
      draw(now);
      raf = visible && !reduceMq.matches && !document.hidden ? requestAnimationFrame(frame) : 0;
    };
    const start = () => {
      if (!raf && visible && !reduceMq.matches && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) start();
        else stop();
      },
      { rootMargin: "80px" },
    );
    io.observe(wrap);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const onMove = (e: PointerEvent) => {
      if (!fineMq.matches || e.pointerType !== "mouse") return;
      const rect = wrap.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      influenceTarget = 1;
    };
    const onLeave = () => {
      influenceTarget = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    const onMq = () => {
      stop();
      draw(performance.now());
      start();
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    reduceMq.addEventListener("change", onMq);
    resize();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      reduceMq.removeEventListener("change", onMq);
    };
  }, []);

  return (
    <div ref={wrapRef} className={s.burstCanvasWrap} aria-hidden="true">
      <canvas ref={canvasRef} className={s.burstCanvas} />
    </div>
  );
}
