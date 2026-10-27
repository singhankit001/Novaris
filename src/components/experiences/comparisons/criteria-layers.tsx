"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { GlowingBorder } from "@/components/fx/surface/glowing-border";
import { cn } from "@/components/nv/cn";
import type { SeoComparisonTable } from "@/lib/seo-pages";

/**
 * Criteria selector: one tab per row of the page's own comparison table, showing both columns
 * for the chosen criterion. All copy comes from the table data.
 */
export function CriteriaLayers({ table }: { table: SeoComparisonTable }) {
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const row = table.rows[i] ?? table.rows[0];
  if (!row) return null;

  const onKey = (e: KeyboardEvent) => {
    const n = table.rows.length;
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const next = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : d ? (i + d + n) % n : -1;
    if (next < 0) return;
    e.preventDefault();
    setI(next);
    refs.current[next]?.focus();
  };

  const layer = (label: string, text: string, accent: boolean) => (
    <GlowingBorder className="rounded-nv-lg">
      <div className={cn("nv-card h-full rounded-nv-lg p-6", accent && "border-nv-copper-700")}>
        <p className="nv-eyebrow">{label}</p>
        <p className="mt-3 text-nv-body leading-relaxed text-nv-ivory-100 text-pretty">{text}</p>
      </div>
    </GlowingBorder>
  );

  return (
    <div>
      <div role="tablist" aria-label="Comparison criteria" onKeyDown={onKey} className="flex flex-wrap gap-2">
        {table.rows.map((r, k) => (
          <button
            key={r.criteria}
            ref={(el) => {
              refs.current[k] = el;
            }}
            id={`crit-tab-${k}`}
            role="tab"
            type="button"
            aria-selected={k === i}
            aria-controls="crit-panel"
            tabIndex={k === i ? 0 : -1}
            onClick={() => setI(k)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-nv-small font-medium transition-colors duration-200 motion-reduce:transition-none",
              k === i ? "border-nv-copper-700 bg-nv-copper-wash text-nv-ivory-50" : "border-nv-graphite-700 bg-white text-nv-ivory-200",
            )}
          >
            {r.criteria}
          </button>
        ))}
      </div>
      <div id="crit-panel" role="tabpanel" aria-labelledby={`crit-tab-${i}`} className="mt-6">
        <div className="relative grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          {layer(table.alternativeLabel, row.alternative, false)}
          <span aria-hidden className="mx-auto h-6 w-px bg-nv-graphite-600 md:h-auto md:w-6 md:self-center md:bg-transparent md:text-center md:text-nv-graphite-400">
            <span className="hidden md:block">+</span>
          </span>
          {layer(table.novarisLabel, row.novaris, true)}
        </div>
        <p className="mt-4 text-nv-micro text-nv-text-muted">Editorial summary from this guide&apos;s table. Not a benchmark.</p>
      </div>
    </div>
  );
}
