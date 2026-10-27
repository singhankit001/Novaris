"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/components/nv/cn";
import { ScrollRail } from "./scroll-rail";

/** Wraps long-form content; a gradient beam and head dot trace reading progress down the left edge. Content is fully readable with motion off. */
export function TracingBeam({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className={cn("relative pl-8 md:pl-12", className)}>
      <ScrollRail target={ref} className="left-[7px] md:left-[11px]" />
      {children}
    </div>
  );
}
