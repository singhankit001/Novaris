"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";
import { cn } from "@/components/nv/cn";
import { H2, Prose } from "@/components/seo/blocks";
import { hasWebGL, useInViewport } from "@/components/fx/scene/shared";
import s from "@/components/seo/seo.module.css";
import { WORKFLOW_STAGES } from "./workflow-stages";

const Scene = dynamic(() => import("./ReviewWorkflowScene"), { ssr: false });

let webglCache: boolean | null = null;
const webglSnapshot = () => (webglCache ??= hasWebGL());
const noSubscribe = () => () => {};

/** Static stand-in with the same footprint: shown before the scene loads and when WebGL is unavailable. */
function StageFallback({ active }: { active: number }) {
  const stage = WORKFLOW_STAGES[active];
  return (
    <div className="absolute inset-0 grid place-items-center p-8">
      <div className="text-center">
        <p className="font-nv-mono text-nv-micro uppercase tracking-[0.14em] text-nv-graphite-400">Stage {String(active + 1).padStart(2, "0")}</p>
        <p className="nv-display mt-3 text-nv-display-md text-nv-ivory-50">{stage?.title}</p>
        <ol aria-hidden className="mx-auto mt-6 flex w-fit gap-2">
          {WORKFLOW_STAGES.map((st, i) => (
            <li key={st.id} className={cn("h-1.5 w-8 rounded-full", i <= active ? "bg-nv-copper-400" : "bg-nv-graphite-700")} />
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * "How this AI code review workflow works": a scroll-driven timeline beside a 3D illustration of each stage.
 * The text carries every fact; the scene is decorative and loads only near the viewport.
 */
export function ReviewWorkflow({ title, intro, notes }: { title: string; intro: string; notes: { title: string; text: string }[] }) {
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState(0);
  const webgl = useSyncExternalStore(noSubscribe, webglSnapshot, () => false);
  const [failed, setFailed] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const near = useInViewport(stageRef, "400px", true);

  // The stage whose text crosses the middle of the viewport becomes active.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = itemRefs.current.indexOf(e.target as HTMLLIElement);
          if (i >= 0) setActive(i);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const el of itemRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, []);

  const select = (i: number) => {
    setActive(i);
    itemRefs.current[i]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  };

  const onSceneError = () => setFailed(true);
  const current = WORKFLOW_STAGES[active];
  const progress = WORKFLOW_STAGES.length > 1 ? active / (WORKFLOW_STAGES.length - 1) : 1;

  return (
    <section aria-labelledby="sol-main-h">
      <div className={s.grid12}>
        <div className={s.leftWide}>
          <H2 id="sol-main-h">{title}</H2>
        </div>
        <div className={s.rightFrom7}>
          <Prose>
            <p>{intro}</p>
          </Prose>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-12 lg:gap-12">
        {/* Illustration: sticky beside the timeline on desktop, pinned above it on phones. */}
        <div className="sticky top-[calc(var(--nv-header-h,72px)+12px)] z-10 lg:order-last lg:col-span-7 lg:top-[calc(var(--nv-header-h,72px)+40px)] lg:self-start">
          <div
            ref={stageRef}
            className="relative h-[clamp(220px,32vh,300px)] overflow-hidden rounded-nv-xl border border-nv-graphite-700 bg-[radial-gradient(120%_90%_at_30%_10%,#ffffff_0%,#f6f7fb_55%,#eef1f8_100%)] shadow-nv-card lg:h-[min(70vh,600px)]"
          >
            <div aria-hidden className="nv-grid-paper absolute inset-0 opacity-60" />
            {webgl && !failed && near ? <Scene active={active} reducedMotion={reduced} onError={onSceneError} /> : <StageFallback active={active} />}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
              <span className="rounded-full border border-nv-graphite-700 bg-white/90 px-2.5 py-1 font-nv-mono text-[10px] uppercase tracking-[0.12em] text-nv-ivory-300">
                Illustrative
              </span>
              <span className="font-nv-mono text-nv-micro text-nv-graphite-400 nv-num">
                {String(active + 1).padStart(2, "0")} / {String(WORKFLOW_STAGES.length).padStart(2, "0")}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-white/95 via-white/80 to-transparent p-4 pt-10">
              <p aria-live="polite" className="text-nv-small font-semibold text-nv-ivory-50">
                {current?.title}
              </p>
              <div role="group" aria-label="Choose a stage" className="flex gap-1">
                {WORKFLOW_STAGES.map((st, i) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => select(i)}
                    aria-label={`Stage ${i + 1}: ${st.title}`}
                    aria-current={i === active ? "step" : undefined}
                    className="group grid size-11 place-items-center rounded-full"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-[width,background-color] duration-300 ease-nv-out",
                        i === active ? "w-6 bg-nv-copper-400" : i < active ? "w-1.5 bg-nv-copper-300/60" : "w-1.5 bg-nv-graphite-600 group-hover:bg-nv-graphite-500",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline: each stage's text drives the illustration as it reaches mid-screen. */}
        <ol className="relative lg:col-span-5">
          <span aria-hidden className="absolute bottom-6 left-[21px] top-6 w-px bg-nv-graphite-700" />
          <span
            aria-hidden
            className="absolute left-[21px] top-6 w-px origin-top bg-[linear-gradient(var(--nv-copper-400),var(--nv-violet-400))] transition-transform duration-700 ease-nv-out"
            style={{ height: "calc(100% - 48px)", transform: `scaleY(${progress})` }}
          />
          {WORKFLOW_STAGES.map((st, i) => {
            const on = i === active;
            return (
              <li
                key={st.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className="relative flex min-h-[46vh] items-center py-8 pl-16 lg:min-h-[62vh]"
              >
                <button
                  type="button"
                  onClick={() => select(i)}
                  aria-label={`Show stage ${i + 1}: ${st.title}`}
                  aria-current={on ? "step" : undefined}
                  className={cn(
                    "absolute left-0 grid size-11 place-items-center rounded-full border font-nv-mono text-nv-small nv-num transition-[background-color,border-color,color,box-shadow] duration-300 ease-nv-out",
                    on
                      ? "border-nv-copper-400 bg-nv-copper-400 text-white shadow-nv-accent"
                      : i < active
                        ? "border-nv-copper-400 bg-white text-nv-copper-400"
                        : "border-nv-graphite-600 bg-white text-nv-graphite-400 hover:border-nv-graphite-500",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </button>
                <div>
                  <p className="font-nv-mono text-nv-micro uppercase tracking-[0.14em] text-nv-graphite-400">{st.summary}</p>
                  <h3 className={cn("mt-2 text-2xl font-semibold tracking-[-0.02em] transition-colors duration-300", on ? "text-nv-ivory-50" : "text-nv-ivory-300")}>
                    {st.title}
                  </h3>
                  <p className="mt-3 max-w-[46ch] text-pretty text-[1.0625rem] leading-relaxed text-nv-ivory-200">{st.detail}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {st.points.map((p) => (
                      <li key={p} className={cn("rounded-full border px-3 py-1 text-nv-small transition-colors duration-300", on ? "border-nv-copper-700 bg-nv-copper-wash text-nv-copper-300" : "border-nv-graphite-700 bg-white text-nv-ivory-200")}>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-16 grid gap-8 border-t border-nv-graphite-700 pt-12 md:grid-cols-2">
        {notes.map((n) => (
          <div key={n.title}>
            <h3 className={s.subTitle}>{n.title}</h3>
            <Prose>
              <p>{n.text}</p>
            </Prose>
          </div>
        ))}
      </div>
    </section>
  );
}
