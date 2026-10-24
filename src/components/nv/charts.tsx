import { useId } from "react";
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
  /** Series colour; blue by default. */
  tone?: "copper" | "violet" | "ion";
}

const stroke = { copper: "#2f54ff", violet: "#7a4dff", ion: "#19b6e6" };

export function Sparkline({ values, label, summary, width = 240, height = 40, className, tone = "copper" }: SparklineProps) {
  const uid = useId();
  if (values.length < 2) return <span className="text-nv-micro text-nv-ivory-300">Not enough data</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const first = pts[0];
  const last = pts[pts.length - 1];
  const area = `${d} L${last[0].toFixed(1)} ${height} L${first[0].toFixed(1)} ${height} Z`;
  const c = stroke[tone];
  return (
    <figure className={cn("m-0", className)}>
      <svg role="img" aria-label={`${label}. ${summary}`} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-xs overflow-visible">
        <defs>
          <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c} stopOpacity="0.18" />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${uid}-a)`} />
        <path d={d} fill="none" stroke={c} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="5" fill={c} opacity="0.16" />
        <circle cx={last[0]} cy={last[1]} r="2.75" fill="#fff" stroke={c} strokeWidth="1.75" />
      </svg>
    </figure>
  );
}

export type SeriesTone = "copper" | "patina" | "violet" | "ion" | "ivory" | "graphite" | "danger" | "warning" | "success";

export interface BarListItem {
  label: string;
  value: number;
  /** Formatted display of value; the bar uses the raw value. */
  display?: string;
  tone?: SeriesTone;
}

const fill: Record<SeriesTone, string> = {
  copper: "bg-[linear-gradient(90deg,#2f54ff,#5b7bff)]",
  patina: "bg-[linear-gradient(90deg,#7a4dff,#9b7bff)]",
  violet: "bg-[linear-gradient(90deg,#7a4dff,#9b7bff)]",
  ion: "bg-[linear-gradient(90deg,#19b6e6,#5fd0f2)]",
  ivory: "bg-nv-ivory-300",
  graphite: "bg-nv-graphite-500",
  danger: "bg-nv-danger",
  warning: "bg-nv-warning",
  success: "bg-nv-success",
};

export function BarList({ items, caption }: { items: BarListItem[]; caption: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <figure className="m-0">
      <figcaption className="nv-eyebrow mb-4">{caption}</figcaption>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((i) => (
          <li key={i.label} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-nv-small sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
            <span className="truncate text-nv-ivory-200">{i.label}</span>
            <span aria-hidden className="h-2 overflow-hidden rounded-full bg-nv-graphite-850 shadow-[inset_0_1px_1px_rgb(21_23_29/0.06)]">
              <span className={cn("block h-full rounded-full", fill[i.tone ?? "copper"])} style={{ width: `${(i.value / max) * 100}%` }} />
            </span>
            <span className="nv-num min-w-12 text-right font-medium text-nv-ivory-100">{i.display ?? i.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export interface StackedSegment {
  label: string;
  value: number;
  tone: SeriesTone;
}

/** Part-to-whole. The legend repeats every value so colour is never the only channel. */
export function StackedBar({ segments, caption, unit = "" }: { segments: StackedSegment[]; caption: string; unit?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <figure className="m-0">
      <figcaption className="nv-eyebrow mb-4">{caption}</figcaption>
      <div aria-hidden className="flex h-3.5 gap-0.5 overflow-hidden rounded-full">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span key={s.label} className={cn("block h-full first:rounded-l-full last:rounded-r-full", fill[s.tone])} style={{ width: `${(s.value / total) * 100}%` }} />
          ))}
      </div>
      <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-nv-small">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-nv-ivory-200">
            <span aria-hidden className={cn("size-2.5 rounded-full", fill[s.tone])} />
            {s.label}
            <span className="nv-num font-medium text-nv-ivory-100">
              {s.value}
              {unit} <span className="font-normal text-nv-ivory-300">({Math.round((s.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

const ring: Record<SeriesTone, string> = {
  copper: "#2f54ff", patina: "#7a4dff", violet: "#7a4dff", ion: "#19b6e6", ivory: "#5a5f6e",
  graphite: "#868b99", danger: "#c22c25", warning: "#b36b00", success: "#11744a",
};

/** Part-to-whole ring with the total at its centre. Segments repeat in a text legend. */
export function RingChart({ segments, caption, total: centre, centreLabel, unit = "" }: {
  segments: StackedSegment[]; caption: string; total?: string | number; centreLabel?: string; unit?: string;
}) {
  const sum = segments.reduce((s, x) => s + x.value, 0);
  const r = 44;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <figure className="m-0">
      <figcaption className="nv-eyebrow mb-4">{caption}</figcaption>
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative size-36 shrink-0">
          <svg aria-hidden viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f2f5" strokeWidth="12" />
            {sum > 0 &&
              segments
                .filter((s) => s.value > 0)
                .map((s) => {
                  const len = (s.value / sum) * circ;
                  const gap = segments.filter((x) => x.value > 0).length > 1 ? 3 : 0;
                  const el = (
                    <circle key={s.label} cx="60" cy="60" r={r} fill="none" stroke={ring[s.tone]} strokeWidth="12" strokeLinecap="butt"
                      strokeDasharray={`${Math.max(len - gap, 0.5)} ${circ}`} strokeDashoffset={-offset} />
                  );
                  offset += len;
                  return el;
                })}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="nv-display nv-num text-[2rem] leading-none text-nv-ivory-50">{centre ?? sum}</span>
            {centreLabel && <span className="mt-1 text-nv-micro text-nv-ivory-300">{centreLabel}</span>}
          </div>
        </div>
        <ul className="m-0 flex min-w-40 flex-1 list-none flex-col gap-2 p-0 text-nv-small">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 text-nv-ivory-200">
              <span className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: ring[s.tone] }} />
                {s.label}
              </span>
              <span className="nv-num font-medium text-nv-ivory-100">{s.value}{unit}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
