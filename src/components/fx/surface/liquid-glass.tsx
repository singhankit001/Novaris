"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/components/nv/cn";
import { RING_MASK } from "./ring-mask";

/**
 * Restrained lens for ONE hero element: a lit silver body, a curved specular rim and a faint chromatic edge.
 * No backdrop-filter and no SVG refraction (Chromium-only, off-policy per DESIGN.md); the highlight follows
 * a fine pointer through two CSS variables. Use once per view.
 */
export function LiquidGlass({ children, className, radius = 28 }: { children: ReactNode; className?: string; radius?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--lg-x", `${Math.round(((e.clientX - r.left) / r.width) * 100)}%`);
        el.style.setProperty("--lg-y", `${Math.round(((e.clientY - r.top) / r.height) * 100)}%`);
      }}
      style={{ "--lg-x": "28%", "--lg-y": "12%", borderRadius: radius } as CSSProperties}
      className={cn(
        "relative isolate overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f1f3f8_100%)] shadow-nv-lift",
        "shadow-[inset_0_1px_0_rgb(255_255_255),inset_0_-18px_30px_-18px_rgb(47_84_255/0.16),0_1px_3px_rgb(21_23_29/0.06),0_28px_56px_-28px_rgb(21_23_29/0.28)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(360px_circle_at_var(--lg-x)_var(--lg-y),rgb(255_255_255/0.95),rgb(255_255_255/0)_60%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ ...RING_MASK, padding: 1.5, borderRadius: radius, background: "conic-gradient(from 200deg, rgb(25 182 230/0.5), rgb(255 255 255/0.9) 25%, rgb(122 77 255/0.45) 50%, rgb(255 255 255/0.9) 75%, rgb(25 182 230/0.5))" }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 -z-10 h-px bg-white" />
      {children}
    </div>
  );
}
