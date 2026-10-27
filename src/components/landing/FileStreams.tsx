"use client";

import { useEffect, useRef } from "react";
import s from "./landing.module.css";

type RGB = readonly [number, number, number];

interface Stream {
  u: number; // -0.5..0.5 lane position at the widest point
  color: RGB;
  alpha: number;
  phase: number;
  speed: number; // particle travel, fraction of width per second
  offset: number;
  dot: number;
}

const COUNT = 72;
const SAMPLES = 180; // dense enough that the pointer's circle edge stays round
// one color per file family: source, components, styles, config, docs
const PALETTE: readonly RGB[] = [
  [47, 84, 255],
  [122, 77, 255],
  [236, 72, 153],
  [245, 158, 11],
  [20, 184, 166],
];
const ANSWER: RGB = [79, 70, 229];

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

function makeStreams(): Stream[] {
  const r = rng(11);
  return Array.from({ length: COUNT }, (_, i) => {
    const band = Math.min(PALETTE.length - 1, Math.floor((i / COUNT) * PALETTE.length + (r() - 0.5) * 0.9));
    return {
      u: (i + 0.5) / COUNT - 0.5 + (r() - 0.5) * 0.008,
      color: PALETTE[Math.max(0, band)]!,
      alpha: 0.3 + r() * 0.4,
      phase: r() * Math.PI * 2,
      speed: 0.05 + r() * 0.07,
      offset: r(),
      dot: 1.4 + r() * 1.3,
    };
  });
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Lane spread across the width: wide on the left, a narrow braid in the middle, one stream out on the right. */
function spread(xn: number) {
  const waist = 0.07;
  return xn < 0.5 ? waist + (0.86 - waist) * smooth(1 - xn / 0.5) : waist + (0.42 - waist) * smooth((xn - 0.5) / 0.5);
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/**
 * Multicolored file streams flow in from the left, braid into one band, and leave as a single answer stream.
 * The pointer parts nearby streams on a spring and lights them up. Decorative (aria-hidden); the meaning is
 * stated in the adjacent copy.
 */
export default function FileStreams() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const streams = makeStreams();
    const ys = new Float32Array(SAMPLES + 1);
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fineMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = false;
    let influence = 0;
    let influenceTarget = 0;
    const target = { x: 0, y: 0 };
    // spring-smoothed pointer so the parting trails the cursor and settles
    const p = { x: 0, y: 0, vx: 0, vy: 0 };

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
      const animated = !reduceMq.matches;
      const t = animated ? now / 1000 : 0;
      ctx.clearRect(0, 0, w, h);

      const pad = h * 0.06;
      const H = h - pad * 2;
      const cy = pad + H / 2;
      const R = Math.max(48, Math.min(w, h) * 0.11);

      p.vx = (p.vx + (target.x - p.x) * 0.12) * 0.72;
      p.vy = (p.vy + (target.y - p.y) * 0.12) * 0.72;
      p.x += p.vx;
      p.y += p.vy;
      influence += (influenceTarget - influence) * 0.08;
      // radius of the clear circle around the pointer; grows in and out with the influence
      const r = animated ? R * influence : 0;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const st of streams) {
        let lit = 0;
        for (let k = 0; k <= SAMPLES; k++) {
          const xn = k / SAMPLES;
          const sp = spread(xn);
          const amp = H * 0.035 * (0.3 + sp);
          ys[k] =
            cy +
            st.u * sp * H +
            Math.sin(xn * 6 + t * 0.6 + st.phase) * amp +
            Math.sin(xn * 13 + t * 0.9 + st.phase * 1.7) * amp * 0.35;
        }
        if (r > 0.5) {
          // each stream keeps to one side of the circle, picked where it passes the pointer,
          // so no stream jumps across the circle
          const kp = Math.min(SAMPLES, Math.max(0, Math.round((p.x / w) * SAMPLES)));
          const side = ys[kp]! >= p.y ? 1 : -1;
          for (let k = 0; k <= SAMPLES; k++) {
            const dx = (k / SAMPLES) * w - p.x;
            const adx = Math.abs(dx);
            if (adx >= r * 1.8) continue;
            const dy = ys[k]! - p.y;
            const f = Math.exp(-((Math.hypot(dx, dy) / (r * 1.6)) ** 2)) * influence;
            if (f > lit) lit = f;
            // offset at the centerline: the circle's rim inside it, eased in ahead of it so the
            // streams round onto the circle instead of hitting a flat edge
            const rim = adx < r ? Math.sqrt(r * r - dx * dx) : 0;
            const shift = rim + r * 0.35 * smooth(1 - adx / (r * 1.8));
            const band = shift + r * 0.9;
            // map the stream's distance on its side from [0, band] onto [shift, band]: streams wrap
            // the rim and bunch just outside it; anything past the band is untouched
            // a stream that dips past the centerline near the circle's flanks is eased back over
            // continuously from -band, so there is no step
            const sd = side * dy;
            if (sd >= 0 && sd < band) ys[k] = p.y + side * (shift + (sd * (band - shift)) / band);
            else if (sd < 0 && sd > -band) ys[k] = p.y + side * (-band + ((sd + band) * (shift + band)) / band);
          }
        }

        const a = Math.min(1, st.alpha + lit * 0.5);
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, rgba(st.color, 0));
        grad.addColorStop(0.14, rgba(st.color, a));
        grad.addColorStop(0.5, rgba(st.color, a));
        grad.addColorStop(0.78, rgba(ANSWER, a * 0.85));
        grad.addColorStop(1, rgba(ANSWER, 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8 + lit * 1.2;
        ctx.beginPath();
        ctx.moveTo(0, ys[0]!);
        for (let k = 1; k <= SAMPLES; k++) ctx.lineTo((k / SAMPLES) * w, ys[k]!);
        ctx.stroke();

        // one file travelling along each stream; it takes the answer color after the braid
        const xn = (st.offset + t * st.speed) % 1;
        const fk = xn * SAMPLES;
        const k0 = Math.floor(fk);
        const py = ys[k0]! + (ys[Math.min(SAMPLES, k0 + 1)]! - ys[k0]!) * (fk - k0);
        const fade = Math.min(1, xn / 0.1, (1 - xn) / 0.1);
        const c = xn < 0.5 ? st.color : ANSWER;
        ctx.fillStyle = rgba(c, Math.min(1, (a + 0.25) * fade));
        ctx.beginPath();
        ctx.arc(xn * w, py, st.dot + lit * 2.4, 0, Math.PI * 2);
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
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
      if (influenceTarget === 0 && influence < 0.01) {
        p.x = target.x;
        p.y = target.y;
      }
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
