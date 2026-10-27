import type { ElementType, ReactNode } from "react";
import { cn } from "./cn";

export interface PanelProps {
  as?: ElementType;
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  /** base = white card; raised = card with a silver gradient floor; sunken = inset silver well. */
  tone?: "base" | "raised" | "sunken";
  /** Holographic hairline edge, reserved for the one hero surface on a view. */
  holo?: boolean;
  children?: ReactNode;
  className?: string;
}

const tones = {
  base: "bg-nv-graphite-900 shadow-nv-card border border-nv-graphite-700",
  raised: "bg-[linear-gradient(180deg,#ffffff_0%,#f6f7fa_100%)] shadow-nv-card border border-nv-graphite-700",
  sunken: "bg-nv-graphite-850 border border-nv-graphite-700 shadow-[inset_0_1px_2px_rgb(21_23_29/0.05)]",
};

export function Panel({ as: Tag = "section", title, eyebrow, actions, tone = "base", holo, children, className }: PanelProps) {
  return (
    <Tag className={cn("rounded-nv-lg", tones[tone], holo && "nv-holo-ring", className)}>
      {(title || actions) && (
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-nv-graphite-700 px-5 py-3">
          <div className="min-w-0">
            {eyebrow && <p className="nv-eyebrow">{eyebrow}</p>}
            {title && <h3 className="truncate text-[0.9375rem] font-semibold tracking-[-0.015em] text-nv-ivory-50">{title}</h3>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </Tag>
  );
}
