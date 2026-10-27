import { cn } from "@/components/nv/cn";
import { CodeLines } from "./code-lines";
import type { CodeLang } from "./highlight";

/**
 * Before/after panes: side by side from md, stacked below. Changed lines are derived from line content
 * (before lines missing from after = removed, the reverse = added) unless given explicitly (1-based, per pane).
 * Server-safe.
 */
export interface CodeComparisonProps {
  beforeCode: string;
  afterCode: string;
  filename: string;
  lang?: CodeLang;
  beforeLabel?: string;
  afterLabel?: string;
  removedLines?: number[];
  addedLines?: number[];
  className?: string;
}

function changed(a: string, b: string): number[] {
  const other = new Set(b.split("\n").map((l) => l.trim()));
  return a.replace(/\n$/, "").split("\n").flatMap((l, i) => (l.trim() && !other.has(l.trim()) ? [i + 1] : []));
}

export function CodeComparison({ beforeCode, afterCode, filename, lang = "ts", beforeLabel = "Before", afterLabel = "After", removedLines, addedLines, className }: CodeComparisonProps) {
  const pane = (label: string, code: string, tone: "add" | "remove", lines: number[]) => (
    <section aria-label={`${label}: ${filename}`} className="min-w-0 border-nv-graphite-700 max-md:first:border-b md:first:border-r">
      <h3 className="m-0 flex min-h-9 items-center gap-2 border-b border-nv-graphite-700 bg-nv-graphite-800 px-3 font-nv-mono text-nv-micro font-normal text-nv-graphite-400">
        <span className={cn("rounded-full px-2 py-0.5 font-nv-sans font-medium", tone === "add" ? "bg-nv-success-wash text-nv-success" : "bg-nv-danger-wash text-nv-danger")}>{label}</span>
        <span className="min-w-0 truncate">{filename}</span>
      </h3>
      <div role="region" tabIndex={0} aria-label={`${label} code`} className="overflow-x-auto">
        <CodeLines code={code} lang={lang} tone={tone} toneLines={lines} />
      </div>
    </section>
  );
  return (
    <figure className={cn("m-0 grid overflow-hidden rounded-nv-md border border-nv-graphite-700 bg-white shadow-nv-card md:grid-cols-2", className)}>
      {pane(beforeLabel, beforeCode, "remove", removedLines ?? changed(beforeCode, afterCode))}
      {pane(afterLabel, afterCode, "add", addedLines ?? changed(afterCode, beforeCode))}
    </figure>
  );
}
