import type { ReactNode } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "./cn";

export type NoticeTone = "info" | "success" | "warning" | "danger";

const tone: Record<NoticeTone, { box: string; chip: string }> = {
  info: { box: "bg-nv-info-wash border-nv-info-edge", chip: "text-nv-info" },
  success: { box: "bg-nv-success-wash border-nv-success-edge", chip: "text-nv-success" },
  warning: { box: "bg-nv-warning-wash border-nv-warning-edge", chip: "text-nv-warning" },
  danger: { box: "bg-nv-danger-wash border-nv-danger-edge", chip: "text-nv-danger" },
};
const icon = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertOctagon };

export interface NoticeProps {
  tone?: NoticeTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** danger/warning use role=alert; others role=status so screen readers announce appropriately. */
export function Notice({ tone: t = "info", title, children, action, className }: NoticeProps) {
  const Icon = icon[t];
  return (
    <div
      role={t === "danger" || t === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-nv-md border p-3.5 shadow-nv-xs", tone[t].box, className)}
    >
      <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-full bg-white shadow-nv-xs", tone[t].chip)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className={cn("text-nv-body font-semibold tracking-[-0.01em]", tone[t].chip)}>{title}</p>
        {children && <div className="mt-1 text-nv-small text-nv-ivory-200">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
