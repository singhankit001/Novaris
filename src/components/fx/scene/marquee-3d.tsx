"use client";

import { useRef } from "react";
import { cn } from "@/components/nv/cn";
import { useInViewport } from "./shared";

/**
 * Marquee3D: tilted perspective wall of product tiles; four columns drift in alternating directions.
 * Pure CSS (perspective + transform keyframes, compositor only). Paused while off-screen, on hover
 * and on keyboard focus-within; static under prefers-reduced-motion. Tiles are illustrative content.
 * Props: tiles (title, path, note, tone), height (CSS length), className.
 */
export interface MarqueeTile {
  title: string;
  path: string;
  note: string;
  tone?: "blue" | "violet" | "silver";
}

const TONE: Record<NonNullable<MarqueeTile["tone"]>, string> = {
  blue: "bg-nv-copper-500",
  violet: "bg-nv-violet-400",
  silver: "bg-nv-graphite-500",
};

function Tile({ t }: { t: MarqueeTile }) {
  return (
    <div className="nv-card w-full shrink-0 p-4">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", TONE[t.tone ?? "silver"])} aria-hidden="true" />
        <p className="truncate text-nv-small font-semibold text-nv-ivory-100">{t.title}</p>
      </div>
      <p className="mt-2 truncate font-nv-mono text-nv-micro text-nv-ivory-300">{t.path}</p>
      <div className="mt-3 space-y-1.5" aria-hidden="true">
        <div className="h-1.5 w-full rounded-full bg-nv-graphite-850" />
        <div className="h-1.5 w-2/3 rounded-full bg-nv-graphite-850" />
      </div>
      <p className="mt-3 text-nv-micro text-nv-text-muted">{t.note}</p>
    </div>
  );
}

const CSS = `
.nv-m3d-col{animation:nv-m3d-up 60s linear infinite;animation-play-state:paused}
.nv-m3d-col[data-dir="down"]{animation-name:nv-m3d-down}
.nv-m3d[data-run="true"]:not(:hover):not(:focus-within) .nv-m3d-col{animation-play-state:running}
@keyframes nv-m3d-up{to{transform:translate3d(0,-50%,0)}}
@keyframes nv-m3d-down{from{transform:translate3d(0,-50%,0)}to{transform:translate3d(0,0,0)}}
@media (prefers-reduced-motion:reduce){.nv-m3d-col{animation:none}}
`;

export function Marquee3D({ tiles, height = "30rem", className }: { tiles: MarqueeTile[]; height?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const run = useInViewport(ref, "0px");
  const cols = [0, 1, 2, 3].map((c) => tiles.filter((_, i) => i % 4 === c));

  return (
    <div
      ref={ref}
      data-run={run}
      className={cn("nv-m3d relative overflow-hidden rounded-nv-xl border border-nv-graphite-700 bg-nv-graphite-850", className)}
      style={{ height }}
    >
      <style>{CSS}</style>
      <div className="absolute inset-0 [perspective:1400px]">
        <div
          className="absolute left-1/2 top-1/2 grid w-[150%] grid-cols-4 gap-4 [transform-style:preserve-3d] sm:w-[120%]"
          style={{ transform: "translate(-50%,-50%) rotateX(52deg) rotateZ(-38deg)" }}
        >
          {cols.map((col, ci) => (
            <div key={ci} className="overflow-visible">
              <div className="nv-m3d-col flex flex-col gap-4 pb-4 will-change-transform" data-dir={ci % 2 ? "down" : "up"} style={{ animationDuration: `${52 + ci * 7}s` }}>
                {col.map((t) => (
                  <Tile key={t.path} t={t} />
                ))}
                <div className="contents" aria-hidden="true">
                  {col.map((t) => (
                    <Tile key={`${t.path}-dup`} t={t} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--nv-graphite-850)_100%)]" aria-hidden="true" />
    </div>
  );
}
