import { formatStat, type PublicStatsData } from "@/components/PublicStats";
import { cn } from "@/components/nv/cn";
import s from "./landing.module.css";

export interface ProductLimits {
  contextTokens: number;
  deepScanFiles: number;
  quickScanFiles: number;
}

interface Cell {
  value: string;
  label: string;
  text?: boolean;
}

/**
 * Four-cell band. Counts come from the public analytics counters and render only when they are
 * real and non-zero; product limits come from the code constants. Gaps fall back to factual
 * statements, never invented numbers.
 */
export default function StatStrip({ stats, limits }: { stats: PublicStatsData; limits: ProductLimits }) {
  const real = (n: number) => Number.isFinite(n) && n > 0;
  const cells: Cell[] = [
    real(stats.totalQueries)
      ? { value: formatStat(stats.totalQueries), label: "Questions asked\nabout public repositories" }
      : { value: "Any public repo", label: "Paste a URL or owner/repo.\nNo install, no clone", text: true },
    real(stats.totalScans)
      ? { value: formatStat(stats.totalScans), label: "Security scans run\non this site" }
      : { value: "Sources shown", label: "Every answer names the\nfiles it relied on", text: true },
    { value: `${limits.contextTokens / 1000}K`, label: "Tokens of context\nloaded for each question" },
    { value: String(limits.deepScanFiles), label: `Files in a deep security scan\n(${limits.quickScanFiles} in a quick scan)` },
  ];

  return (
    <section aria-labelledby="strip-h" className={s.sectionTight}>
      <h2 id="strip-h" className="sr-only">
        Novaris in numbers
      </h2>
      <dl className={cn(s.strip, "m-0")}>
        {cells.map((c, i) => (
          <div key={c.label} className={s.cell}>
            <dd className="m-0">
              <span className={cn(s.num, "nv-num nv-display", i === 0 && s.numInk, c.text && s.numText)}>{c.value}</span>
            </dd>
            <dt className={s.cellLabel}>
              {c.label.split("\n").map((line, j) => (
                <span key={j} className="block">
                  {line}
                </span>
              ))}
            </dt>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-nv-micro text-nv-ivory-300">Counts are Novaris usage counters, rounded down. Limits are the current product settings.</p>
    </section>
  );
}
