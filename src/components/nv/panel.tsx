import type { ElementType, ReactNode } from "react";
import { cn } from "./cn";

export interface PanelProps {
  as?: ElementType;
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  /** raised = one tone lighter; sunken = inset well. Elevation is tone + hairline, never glow. */
  tone?: "base" | "raised" | "sunken";
  children?: ReactNode;
  className?: string;
}

const tones = {
  base: "bg-nv-graphite-900",
  raised: "bg-nv-graphite-800",
  sunken: "bg-nv-graphite-850",
};

export function Panel({ as: Tag = "section", title, eyebrow, actions, tone = "base", children, className }: PanelProps) {
  return (
    <Tag className={cn("rounded-nv-md border border-nv-graphite-700", tones[tone], className)}>
      {(title || actions) && (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-nv-graphite-700 px-4 py-2">
          <div className="min-w-0">
            {eyebrow && <p className="nv-eyebrow">{eyebrow}</p>}
            {title && <h3 className="truncate text-nv-body font-medium text-nv-ivory-50">{title}</h3>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </Tag>
  );
}
