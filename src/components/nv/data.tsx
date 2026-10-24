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
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="nv-eyebrow">{label}</dt>
      <dd className="m-0">
        <span className="nv-display nv-num text-nv-display-md text-nv-ivory-50">{value}</span>
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
        <span className="block truncate text-nv-body text-nv-ivory-100">{title}</span>
        {meta && <span className="block truncate text-nv-small text-nv-ivory-300">{meta}</span>}
      </span>
      {trailing && <span className="nv-num shrink-0 text-nv-small text-nv-ivory-200">{trailing}</span>}
    </>
  );
  const cls = cn(
    "flex min-h-14 items-center gap-3 border-b border-nv-graphite-700 px-3 py-2",
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
}

/** Semantic table; horizontal scroll container is keyboard-focusable for small screens. */
export function DataTable<T>({ caption, columns, rows, rowKey, empty }: DataTableProps<T>) {
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="overflow-x-auto rounded-nv-md border border-nv-graphite-700">
      <table className="w-full border-collapse text-left text-nv-body">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-nv-graphite-850">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn("nv-eyebrow whitespace-nowrap border-b border-nv-graphite-700 px-3 py-2.5 font-normal", c.numeric && "text-right")}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-b border-nv-graphite-700 last:border-0 hover:bg-nv-graphite-850">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-3 align-top text-nv-ivory-100", c.numeric && "nv-num text-right", c.className)}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-nv-ivory-300">
                {empty ?? "No rows"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
