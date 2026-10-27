import type { ReactNode } from "react";
import { cn } from "./cn";

export interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  /** Where the number comes from, e.g. "GitHub REST, 14 Oct". Required: no unsourced figures. */
  source: string;
  basis?: "measured" | "inferred";
  className?: string;
}

export function Metric({ label, value, unit, source, basis = "measured", className }: MetricProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <dt className="nv-eyebrow">{label}</dt>
      <dd className="m-0">
        <span className="nv-display nv-num text-nv-display-md font-medium text-nv-ivory-50">{value}</span>
        {unit && <span className="ml-1 text-nv-small text-nv-ivory-300">{unit}</span>}
        <span className="mt-1 block text-nv-micro text-nv-ivory-300">
          {basis === "inferred" ? "Inferred" : "Measured"} · {source}
        </span>
      </dd>
    </div>
  );
}

export function MetricGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4", className)}>{children}</dl>;
}

export interface MetricStripItem {
  label: string;
  value: ReactNode;
  /** One line under the value: where the figure comes from. */
  note?: string;
  /** Optional trailing visual, e.g. a Sparkline. */
  visual?: ReactNode;
}

/**
 * Full-width bordered band of large light-weight numerals. The first value is ink, the rest muted.
 * A short blue-to-violet hairline sits on the left of the top and bottom borders and fades out.
 */
export function MetricStrip({ items, label, className }: { items: MetricStripItem[]; label: string; className?: string }) {
  return (
    <section aria-label={label} className={cn("relative border-y border-nv-graphite-700 bg-white/60", className)}>
      <span aria-hidden className="pointer-events-none absolute -top-px left-0 h-px w-40 bg-[linear-gradient(90deg,#2f54ff,#7a4dff_55%,transparent)]" />
      <span aria-hidden className="pointer-events-none absolute -bottom-px left-0 h-px w-40 bg-[linear-gradient(90deg,#2f54ff,#7a4dff_55%,transparent)]" />
      <dl className={cn("m-0 grid grid-cols-2 divide-nv-graphite-700 md:divide-x", items.length === 3 ? "md:grid-cols-3" : items.length === 2 ? "md:grid-cols-2" : "md:grid-cols-4")}>
        {items.map((it, i) => (
          <div
            key={it.label}
            className={cn(
              "flex min-w-0 flex-col justify-between gap-3 px-5 py-6 md:px-7 md:py-8",
              i % 2 === 1 && "max-md:border-l max-md:border-nv-graphite-700",
              i > 1 && "max-md:border-t max-md:border-nv-graphite-700",
            )}
          >
            <dt className="max-w-[16ch] text-nv-small leading-snug text-nv-ivory-300">{it.label}</dt>
            <dd className="m-0">
              <span
                className={cn(
                  "nv-num block text-[clamp(2.25rem,1.6rem+2.4vw,3.75rem)] font-light leading-none tracking-[-0.04em]",
                  i === 0 ? "text-nv-ivory-50" : "text-nv-ivory-300",
                )}
              >
                {it.value}
              </span>
              {it.note && <span className="mt-2 block text-nv-micro text-nv-ivory-300">{it.note}</span>}
              {it.visual && <span className="mt-3 block max-w-[9rem]">{it.visual}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export interface DataRowProps {
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  leading?: ReactNode;
  /** Makes the whole row a link (single tab stop). */
  href?: string;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

/** A list row: title + meta left, tabular figures right. Whole-row link keeps one tab stop and a 44px target. */
export function DataRow({ title, meta, trailing, leading, href, selected, disabled, className }: DataRowProps) {
  const body = (
    <>
      {leading && <span aria-hidden className="shrink-0 text-nv-ivory-300">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-nv-body font-medium text-nv-ivory-100">{title}</span>
        {meta && <span className="block truncate text-nv-small text-nv-ivory-300">{meta}</span>}
      </span>
      {trailing && <span className="nv-num shrink-0 text-nv-small text-nv-ivory-200">{trailing}</span>}
    </>
  );
  const cls = cn(
    "flex min-h-14 items-center gap-3 border-b border-nv-graphite-700 px-4 py-2.5 transition-colors duration-150 last:border-b-0",
    selected && "bg-nv-copper-wash shadow-[inset_2px_0_0_var(--nv-copper-400)]",
    href && !disabled && "hover:bg-nv-graphite-800",
    disabled && "cursor-not-allowed opacity-45",
    className,
  );
  if (href && !disabled) {
    return (
      <a href={href} aria-current={selected ? "true" : undefined} className={cls}>
        {body}
      </a>
    );
  }
  return (
    <div className={cls} aria-disabled={disabled || undefined}>
      {body}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  numeric?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  /** Below md, each row becomes a labelled card instead of a horizontally scrolling table. */
  stack?: boolean;
}

/** Semantic table; sticky header; horizontal scroll container is keyboard-focusable for small screens. */
export function DataTable<T>({ caption, columns, rows, rowKey, empty, stack }: DataTableProps<T>) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="max-h-[70dvh] overflow-auto rounded-nv-lg border border-nv-graphite-700 bg-white shadow-nv-card"
    >
      <table className={cn("w-full border-collapse text-left text-nv-body", stack && "max-md:block")}>
        <caption className="sr-only">{caption}</caption>
        <thead className={cn("sticky top-0 z-10 bg-nv-graphite-800", stack && "max-md:sr-only")}>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn("nv-eyebrow whitespace-nowrap border-b border-nv-graphite-700 px-4 py-3 font-medium", c.numeric && "text-right")}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn(stack && "max-md:block")}>
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              className={cn(
                "border-b border-nv-graphite-700 transition-colors duration-150 last:border-0 hover:bg-nv-copper-wash/50",
                stack && "max-md:block max-md:px-4 max-md:py-3",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-label={c.header}
                  className={cn(
                    "px-4 py-3.5 align-top text-nv-ivory-100",
                    c.numeric && "nv-num text-right",
                    stack && "max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1 max-md:text-left before:max-md:content-[attr(data-label)] before:max-md:text-nv-micro before:max-md:uppercase before:max-md:tracking-[0.1em] before:max-md:text-nv-ivory-300",
                    c.className,
                  )}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr className={cn(stack && "max-md:block")}>
              <td colSpan={columns.length} className={cn("px-4 py-10 text-center text-nv-ivory-300", stack && "max-md:block")}>
                {empty ?? "No rows"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
