import { cn } from "@/components/nv/cn";

/** Marks demonstration data as written for the page, not output from a Novaris run. */
export function IllustrativeTag({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn("m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-nv-micro text-nv-ivory-300", className)}>
      <span className="inline-flex items-center rounded-full border border-nv-violet-400/40 bg-nv-violet-wash px-2.5 py-0.5 font-medium text-nv-violet-600">Illustrative example</span>
      <span>{children}</span>
    </p>
  );
}

/** Per-claim provenance label: Measured = counted or read directly; Inferred = reasoned from what was read. */
export function Basis({ kind }: { kind: "Measured" | "Inferred" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-nv-micro font-medium",
        kind === "Measured" ? "bg-nv-success-wash text-nv-success" : "bg-nv-warning-wash text-nv-warning",
      )}
    >
      {kind}
    </span>
  );
}
