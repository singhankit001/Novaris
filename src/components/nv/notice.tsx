import type { ReactNode } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "./cn";

export type NoticeTone = "info" | "success" | "warning" | "danger";

const tone: Record<NoticeTone, string> = {
  info: "bg-nv-info-wash border-nv-info-edge text-nv-info",
  success: "bg-nv-success-wash border-nv-success-edge text-nv-success",
  warning: "bg-nv-warning-wash border-nv-warning-edge text-nv-warning",
  danger: "bg-nv-danger-wash border-nv-danger-edge text-nv-danger",
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
      className={cn("flex gap-3 rounded-nv-md border-l-2 border-y border-r p-3", tone[t], className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-nv-body font-medium">{title}</p>
        {children && <div className="mt-1 text-nv-small text-nv-ivory-200">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
