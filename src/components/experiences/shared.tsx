import type { ReactNode } from "react";
import { AlertOctagon, AlertTriangle, FlaskConical, Info } from "lucide-react";
import { cn } from "@/components/nv/cn";
import type { Severity } from "@/components/fx/graph/graph-types";

/** Frame that marks everything inside as an illustrated demonstration, never real product output. */
export function DemoFrame({ title, note, children, className }: { title: string; note: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("nv-card overflow-hidden", className)}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-nv-graphite-700 bg-nv-graphite-850 px-4 py-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-nv-info-edge bg-nv-info-wash px-2.5 py-1 text-nv-micro font-medium text-nv-info">
          <FlaskConical aria-hidden className="size-3.5" />
          Illustrative example
        </span>
        <p className="m-0 min-w-0 flex-1 basis-64 text-nv-small leading-snug text-nv-ivory-300">
          <span className="font-medium text-nv-ivory-100">{title}.</span> {note}
        </p>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

const SEV = {
  critical: { Icon: AlertOctagon, cls: "border-nv-danger-edge bg-nv-danger-wash text-nv-danger", text: "Critical" },
  high: { Icon: AlertOctagon, cls: "border-nv-danger-edge bg-nv-danger-wash text-nv-danger", text: "High" },
  medium: { Icon: AlertTriangle, cls: "border-nv-warning-edge bg-nv-warning-wash text-nv-warning", text: "Medium" },
  low: { Icon: Info, cls: "border-nv-info-edge bg-nv-info-wash text-nv-info", text: "Low" },
} as const;

/** Severity is always icon + word + colour. */
export function SeverityTag({ severity, className }: { severity: Severity; className?: string }) {
  const { Icon, cls, text } = SEV[severity];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-nv-xs border px-1.5 py-0.5 text-nv-micro font-medium", cls, className)}>
      <Icon aria-hidden className="size-3.5" />
      {text}
    </span>
  );
}

export interface DemoFinding {
  id: string;
  severity: Severity;
  title: string;
  file: string;
  lines: string;
  why: string;
}
