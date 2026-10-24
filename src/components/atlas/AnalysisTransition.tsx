"use client";
import { Children, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion as m } from "framer-motion";
import { useEffectiveReduced } from "./use-reduced";
import type { AtlasPhase, MotionPreference } from "./types";

const OUT = [0.2, 0.7, 0.2, 1] as const;
const IN_OUT = [0.65, 0, 0.35, 1] as const;

export interface AnalysisTransitionProps {
  phase: AtlasPhase;
  /** Submitted identity, kept on screen across every phase. Use `AnalysisIdentity` in the form too for shared-element flight. */
  identity: ReactNode;
  /** The atlas. Mounted from the first real phase; shown as soon as it is passed. */
  atlas?: ReactNode;
  /** Result groups. Rendered the moment they exist: never held back for animation. */
  children?: ReactNode;
  /** Recovery state. On failure it replaces the atlas directly. */
  failure?: ReactNode;
  motion?: MotionPreference;
}

/** Shared-element id. Render the same id in the submit form and in the results header. */
export function AnalysisIdentity({ children, reduced }: { children: ReactNode; reduced?: boolean }) {
  return (
    <m.div layoutId="nv-analysis-identity" layout="position" transition={reduced ? { duration: 0 } : { duration: 0.45, ease: IN_OUT }} className="inline-flex">
      {children}
    </m.div>
  );
}

export function AnalysisTransition({ phase, identity, atlas, children, failure, motion }: AnalysisTransitionProps) {
  const reduced = useEffectiveReduced(motion);
  const fade = { duration: reduced ? 0.15 : 0.22, ease: OUT };
  const showAtlas = !!atlas && phase !== "idle" && phase !== "failed";
  return (
    <LayoutGroup>
      <div className="flex flex-col gap-6">
        <AnalysisIdentity reduced={reduced}>{identity}</AnalysisIdentity>
        <AnimatePresence initial={false} mode="popLayout">
          {showAtlas && (
            <m.div key="atlas" className="overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: fade }} transition={{ duration: reduced ? 0.15 : 0.45, ease: IN_OUT }}>
              <m.div initial={{ y: 16 }} animate={{ y: 0 }} transition={{ duration: reduced ? 0 : 0.45, ease: IN_OUT }}>
                {atlas}
              </m.div>
            </m.div>
          )}
          {phase === "failed" && failure && (
            <m.div key="failure" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={fade}>
              {failure}
            </m.div>
          )}
        </AnimatePresence>
        {Children.toArray(children).map((child, i) => (
          <m.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...fade, y: { duration: reduced ? 0 : 0.22, ease: OUT }, delay: reduced ? 0 : Math.min(i, 5) * 0.04 }}>
            {child}
          </m.div>
        ))}
      </div>
    </LayoutGroup>
  );
}
