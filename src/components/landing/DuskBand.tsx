"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/components/nv/cn";
import s from "./landing.module.css";

export interface DuskLimits {
  contextTokens: number;
  deepScanFiles: number;
  quickScanFiles: number;
}

const STRANDS = 56;

/** Slow flowing ribbon of thin strands in the dusk gradient. Static frame under reduced motion; paused off-screen. */
function useRibbon(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = false;

    const draw = (now: number) => {
      const t = reduceMq.matches ? 2.2 : now / 1000;
      ctx.clearRect(0, 0, w, h);
      const stops = (g: CanvasGradient, a: number) => {
        g.addColorStop(0, `rgba(122,77,255,${a})`);
        g.addColorStop(0.38, `rgba(192,75,216,${a})`);
        g.addColorStop(0.66, `rgba(255,94,138,${a})`);
        g.addColorStop(1, `rgba(255,154,61,${a})`);
      };
      const cy = h * 0.58;
      const step = 8;
      const yAt = (x: number, u: number) => {
        const amp = h * (0.2 + 0.1 * Math.sin(x * 0.0024 + t * 0.25));
        const wave = Math.sin(x * 0.0046 + t * 0.5 + u * 2.4) * 0.8 + Math.sin(x * 0.0097 - t * 0.35 + u * 3.1) * 0.3;
        const thick = h * (0.14 + 0.2 * (0.5 + 0.5 * Math.sin(x * 0.0031 - t * 0.22)));
        return cy + wave * amp * 0.7 + (u - 0.5) * thick * 2;
      };
      // soft body between the outer strands
      const body = ctx.createLinearGradient(0, 0, w, 0);
      stops(body, 0.24);
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, yAt(x, 0));
      for (let x = w + step; x >= 0; x -= step) ctx.lineTo(x, yAt(x, 1));
      ctx.closePath();
      ctx.fill();
      // strands
      const line = ctx.createLinearGradient(0, 0, w, 0);
      stops(line, 0.8);
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      for (let k = 0; k < STRANDS; k++) {
        const u = k / (STRANDS - 1);
        ctx.globalAlpha = 0.25 + 0.5 * Math.sin(Math.PI * u);
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const y = yAt(x, u);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = host.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
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
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      if (visible) start();
      else stop();
    });
    io.observe(host);
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const onVis = () => (document.hidden ? stop() : start());
    const onMq = () => {
      stop();
      draw(performance.now());
      start();
    };
    document.addEventListener("visibilitychange", onVis);
    reduceMq.addEventListener("change", onMq);
    resize();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      reduceMq.removeEventListener("change", onMq);
    };
  }, [canvasRef]);
}

export default function DuskBand({ limits }: { limits: DuskLimits }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useRibbon(canvasRef);
  return (
    <section aria-labelledby="dusk-h" className={s.sectionTight}>
      <div className={s.dusk}>
        <canvas ref={canvasRef} className={s.duskCanvas} aria-hidden="true" />
        <div aria-hidden className={s.duskVeil} />
        <div className={s.duskIn}>
          <div>
            <p className={s.kicker}>Whole files, not snippets</p>
            <h2 id="dusk-h" className={cn(s.duskH, "nv-display")}>
              Read the whole repository, <em>not a fragment of it.</em>
            </h2>
            <p className={s.sub}>
              Novaris loads complete files into the model&apos;s context, so imports, callers and configuration sit next to the code you asked about. Each answer links the files it used.
            </p>
          </div>
          <div>
            <dl className={s.duskMetrics}>
              <div className={s.duskMetric}>
                <dd className="nv-num nv-display">{limits.contextTokens / 1000}K</dd>
                <dt>token context window</dt>
              </div>
              <div className={s.duskMetric}>
                <dd className="nv-num nv-display">{limits.quickScanFiles}</dd>
                <dt>files in a quick security scan</dt>
              </div>
              <div className={s.duskMetric}>
                <dd className="nv-num nv-display">{limits.deepScanFiles}</dd>
                <dt>files in a deep scan (sign in)</dt>
              </div>
            </dl>
            <p className={s.duskNote}>Figures are the current product limits.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
