import type { ReactNode } from "react";
import { cn } from "@/components/nv/cn";
import s from "./seo.module.css";

/** Full-page designed state (404, route error): luminous backdrop, serif-italic code, actions. */
export default function StateScreen({
  code,
  title,
  children,
  actions,
  reference,
  alert,
}: {
  code: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  reference?: string;
  alert?: boolean;
}) {
  return (
    <section role={alert ? "alert" : undefined} aria-labelledby="state-h" className={s.stateWrap}>
      <div aria-hidden className={cn("nv-aurora", s.heroGlow)}>
        <div className={cn(s.heroGrid, "nv-grid-paper")} />
      </div>
      <div className={s.stateInner}>
        <p aria-hidden className={cn(s.stateCode, "nv-num")}>
          {code}
        </p>
        <h1 id="state-h" className={cn(s.stateTitle, "nv-display")}>
          {title}
        </h1>
        {children && <div className={s.stateText}>{children}</div>}
        {reference && <p className={s.stateRef}>{reference}</p>}
        {actions && <div className={s.stateActions}>{actions}</div>}
      </div>
    </section>
  );
}
