import type { ReactNode } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDashed, Info, Minus } from "lucide-react";
import { cn } from "./cn";

export type Status = "success" | "warning" | "danger" | "info" | "neutral" | "pending";

const tone: Record<Status, string> = {
  success: "bg-nv-success-wash text-nv-success border-nv-success-edge",
  warning: "bg-nv-warning-wash text-nv-warning border-nv-warning-edge",
  danger: "bg-nv-danger-wash text-nv-danger border-nv-danger-edge",
  info: "bg-nv-info-wash text-nv-info border-nv-info-edge",
  neutral: "bg-nv-graphite-850 text-nv-ivory-200 border-nv-graphite-600",
  pending: "bg-white text-nv-ivory-300 border-nv-graphite-600 border-dashed",
};
const icons = { success: CheckCircle2, warning: AlertTriangle, danger: AlertOctagon, info: Info, neutral: Minus, pending: CircleDashed };

export interface BadgeProps {
  status?: Status;
  children: ReactNode;
  className?: string;
}

/** Compact label: mono, small caps feel, a hairline edge. */
export function Badge({ status = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-nv-xs border px-1.5 py-0.5 font-nv-mono text-[0.6875rem] font-medium uppercase leading-4 tracking-[0.06em]",
        tone[status],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Status never relies on colour alone: icon + text label always rendered. */
export function StatusPill({ status, children, className }: BadgeProps & { status: Status }) {
  const Icon = icons[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border py-1 pl-2 pr-3 text-nv-small font-medium shadow-nv-xs",
        tone[status],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {children}
    </span>
  );
}

/** Evidence basis: measured values come from API data, inferred values come from model reasoning. */
export function BasisTag({ basis }: { basis: "measured" | "inferred" | "unknown" }) {
  const map = {
    measured: { s: "success" as const, t: "Measured" },
    inferred: { s: "warning" as const, t: "Inferred" },
    unknown: { s: "pending" as const, t: "Not available" },
  }[basis];
  return <Badge status={map.s}>{map.t}</Badge>;
}
