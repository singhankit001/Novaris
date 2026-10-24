import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("nv-skeleton h-4 rounded-nv-xs", className)} />;
}

/** Wrap skeleton groups so assistive tech hears one polite status instead of many shapes. */
export function LoadingRegion({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-nv-small text-nv-ivory-200", className)}>
      <Loader2 aria-hidden className="nv-spin size-4" />
      {label}
    </span>
  );
}

/** Work of unknown length (GitHub fetch, model reply, scan). Never renders a percentage. Pair with a phase label. */
export function IndeterminateProgress({ label, phase }: { label: string; phase?: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuetext={phase ?? "In progress"} className="flex flex-col gap-2">
      <div className="nv-indeterminate relative h-0.5 overflow-hidden bg-nv-graphite-700" />
      {phase && <p className="text-nv-micro text-nv-ivory-300">{phase}</p>}
    </div>
  );
}
