import { cn } from "./cn";

/** Chart primitives only draw data the product holds. Each exposes a text alternative (sr-only list). */

export interface SparklineProps {
  values: number[];
  label: string;
  /** Plain-language summary for assistive tech, e.g. "Commits per week, 12 weeks, from 4 to 31". */
  summary: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ values, label, summary, width = 240, height = 40, className }: SparklineProps) {
  if (values.length < 2) return <span className="text-nv-micro text-nv-ivory-300">Not enough data</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <figure className={cn("m-0", className)}>
      <svg role="img" aria-label={`${label}. ${summary}`} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-xs overflow-visible">
        <path d={d} fill="none" stroke="var(--nv-copper-400)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--nv-graphite-950)" stroke="var(--nv-copper-300)" strokeWidth="1.5" />
      </svg>
    </figure>
  );
}

export interface BarListItem {
  label: string;
  value: number;
  /** Formatted display of value; the bar uses the raw value. */
  display?: string;
  tone?: "copper" | "patina" | "ivory";
}

const bar = { copper: "bg-nv-copper-400", patina: "bg-nv-patina-400", ivory: "bg-nv-ivory-300" };

export function BarList({ items, caption }: { items: BarListItem[]; caption: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <figure className="m-0">
      <figcaption className="nv-eyebrow mb-3">{caption}</figcaption>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((i) => (
          <li key={i.label} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-nv-small sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
            <span className="truncate text-nv-ivory-200">{i.label}</span>
            <span aria-hidden className="h-2 rounded-nv-xs bg-nv-graphite-800">
              <span className={cn("block h-full rounded-nv-xs", bar[i.tone ?? "copper"])} style={{ width: `${(i.value / max) * 100}%` }} />
            </span>
            <span className="nv-num min-w-12 text-right text-nv-ivory-100">{i.display ?? i.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export interface StackedSegment {
  label: string;
  value: number;
  tone: "copper" | "patina" | "ivory" | "graphite";
}
const seg = { copper: "bg-nv-copper-400", patina: "bg-nv-patina-400", ivory: "bg-nv-ivory-300", graphite: "bg-nv-graphite-500" };

/** Part-to-whole. The legend repeats every value so colour is never the only channel. */
export function StackedBar({ segments, caption, unit = "" }: { segments: StackedSegment[]; caption: string; unit?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <figure className="m-0">
      <figcaption className="nv-eyebrow mb-3">{caption}</figcaption>
      <div aria-hidden className="flex h-3 gap-px overflow-hidden rounded-nv-xs">
        {segments.map((s) => (
          <span key={s.label} className={cn("block h-full", seg[s.tone])} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 text-nv-small">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-nv-ivory-200">
            <span aria-hidden className={cn("size-2.5 rounded-[2px]", seg[s.tone])} />
            {s.label}
            <span className="nv-num text-nv-ivory-100">
              {s.value}
              {unit} <span className="text-nv-ivory-300">({Math.round((s.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
