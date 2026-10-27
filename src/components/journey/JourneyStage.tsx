"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, RefreshCw, SearchX, Gauge } from "lucide-react";
import { countDone, describeStage, statusLine, type AnyStage, type JourneyFailure, type SceneModel } from "./model";
import { hasWebGL, isLowPower, readDeviceInfo, type RenderMode } from "./capabilities";
import type { SceneHandle } from "./scene3d";
import { SvgWorld } from "./SvgWorld";
import s from "./journey.module.css";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
    const mq = window.matchMedia(REDUCED_QUERY);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
}
function useReducedMotionPref(): boolean {
    return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);
}

export interface JourneyStageProps {
    kind: "profile" | "repo";
    /** Username or owner/repo, shown large. */
    subject: string;
    stages: AnyStage[];
    model: SceneModel | null;
    /** All real data has arrived. */
    ready: boolean;
    failure: JourneyFailure | null;
    /** Data came from sessionStorage: play the short version. */
    cached: boolean;
    exiting: boolean;
    /** Called exactly once when the reveal is complete or skipped with data ready. */
    onDone: () => void;
    onRetry: () => void;
}

const READY_DEADLINE_MS = 1500;

function failureCopy(kind: "profile" | "repo", f: JourneyFailure, subject: string) {
    switch (f.kind) {
        case "not-found":
            return {
                icon: <SearchX className="size-5" aria-hidden />,
                title: kind === "profile" ? `No GitHub account named ${subject}` : `${subject} was not found`,
                body: "Check the spelling, or paste the full URL. Private repositories cannot be analysed without access.",
            };
        case "rate-limit":
            return {
                icon: <Gauge className="size-5" aria-hidden />,
                title: "GitHub is limiting requests right now",
                body: "The public rate limit was reached. Signing in raises it, or you can retry in a minute.",
            };
        case "invalid":
            return { icon: <SearchX className="size-5" aria-hidden />, title: "That does not look like a GitHub name", body: "Use a username such as torvalds, or owner/repo." };
        default:
            return { icon: <AlertTriangle className="size-5" aria-hidden />, title: "The analysis could not finish", body: "Nothing was lost. Retry, or go back and try another name." };
    }
}

function StageList({ stages, still }: { stages: AnyStage[]; still: boolean }) {
    return (
        <ol className={s.stages}>
            {stages.map((st) => (
                <li key={`${st.id}-${st.status}`} className={`${s.stage} ${still ? s.stageFade : ""}`} data-state={st.status}>
                    <span className={s.icon} aria-hidden>
                        {st.status === "done" ? <Check className="size-4 text-nv-copper-400" strokeWidth={2.5} /> : st.status === "failed" ? <AlertTriangle className="size-4 text-nv-danger" /> : <span className={s.dot} data-state={st.status} />}
                    </span>
                    <span>
                        <span className={s.stageName}>{st.label}</span>
                        <span className={`${s.stageDetail} nv-num`}>
                            <span className="sr-only">{st.status}: </span>
                            {describeStage(st)}
                        </span>
                    </span>
                </li>
            ))}
        </ol>
    );
}

export function JourneyStage({ kind, subject, stages, model, ready, failure, cached, exiting, onDone, onRetry }: JourneyStageProps) {
    const reduced = useReducedMotionPref();
    const [skipped, setSkipped] = useState(false);
    const [mode, setMode] = useState<RenderMode>(() => (typeof window !== "undefined" && hasWebGL() ? "3d" : "svg"));
    const [handle, setHandle] = useState<SceneHandle | null>(null);
    const [canvasOn, setCanvasOn] = useState(false);
    const hostRef = useRef<HTMLDivElement>(null);
    const doneRef = useRef(false);
    const onDoneRef = useRef(onDone);
    useEffect(() => {
        onDoneRef.current = onDone;
    });
    const doneCountRef = useRef(0);

    const finish = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDoneRef.current();
    };

    const live3d = mode === "3d" && !reduced && !skipped;

    // Mount the WebGL world (three and gsap load on demand).
    useEffect(() => {
        if (!live3d) return;
        let cancelled = false;
        let mounted: SceneHandle | null = null;
        void import("./scene3d")
            .then(({ mountScene }) => {
                const host = hostRef.current;
                if (cancelled || !host) return;
                mounted = mountScene({ container: host, lowPower: isLowPower(readDeviceInfo()), fast: cached, onContextLost: () => setMode("svg") });
                setHandle(mounted);
                requestAnimationFrame(() => setCanvasOn(true));
            })
            .catch(() => {
                if (!cancelled) setMode("svg");
            });
        return () => {
            cancelled = true;
            mounted?.dispose();
            setHandle(null);
            setCanvasOn(false);
        };
        // cached is read once at mount; changing it must not rebuild the scene.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [live3d]);

    useEffect(() => {
        if (handle && model) handle.setModel(model);
    }, [handle, model]);

    const done = countDone(stages);
    const commitsDone = stages.some((st) => st.id === "commits" && st.status === "done");
    useEffect(() => {
        if (done > doneCountRef.current) handle?.pulse();
        doneCountRef.current = done;
    }, [done, handle]);
    const commitOwners = model?.commits;
    useEffect(() => {
        if (commitsDone && commitOwners) handle?.setCommits(commitOwners);
    }, [commitsDone, commitOwners, handle]);

    // Hand off: reveal when data is ready, never later than the deadline.
    useEffect(() => {
        if (!ready || failure || doneRef.current) return;
        if (skipped) {
            finish();
            return;
        }
        const deadline = window.setTimeout(finish, READY_DEADLINE_MS);
        let settle = 0;
        if (live3d && handle) {
            void handle.reveal().then(finish);
        } else if (!live3d) {
            settle = window.setTimeout(finish, reduced ? 700 : cached ? 500 : 1000);
        }
        return () => {
            window.clearTimeout(deadline);
            window.clearTimeout(settle);
        };
        // finish only touches refs, so it is stable.
    }, [ready, failure, skipped, live3d, handle, reduced, cached]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !failure) setSkipped(true);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [failure]);

    const line = statusLine(subject, stages);
    const [head, tail] = kind === "repo" && subject.includes("/") ? [`${subject.split("/")[0]}/`, subject.split("/").slice(1).join("/")] : ["", subject];
    const fc = failure ? failureCopy(kind, failure, kind === "profile" ? `@${subject}` : subject) : null;

    if (skipped && !failure) {
        return (
            <div className={s.root} data-exiting={exiting} data-journey="skipped">
                <div className={s.backdrop} />
                <div className={s.skippedWrap}>
                    <div className={s.panel}>
                        <p className="nv-eyebrow">Animation skipped</p>
                        <h2 className="nv-display mb-3 mt-1 break-words text-nv-title">{subject}</h2>
                        <StageList stages={stages} still />
                        <p role="status" aria-live="polite" className="sr-only">
                            {line}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={s.root} data-exiting={exiting} data-journey={live3d ? "3d" : reduced ? "still" : "svg"}>
            <div className={s.backdrop} />
            {live3d ? <div ref={hostRef} className={s.canvasHost} data-on={canvasOn} /> : <SvgWorld model={model} still={reduced} commitsReady={commitsDone} />}
            <div className={s.vignette} />
            <div className={s.frameTop} />
            <div className={s.frameBottom} />

            <div className={s.hud}>
                <header className={s.topbar}>
                    <span className={s.brand}>
                        <span className={s.brandMark} aria-hidden />
                        <span className="nv-eyebrow">Novaris · {kind === "profile" ? "Developer intelligence" : "Repository intelligence"}</span>
                    </span>
                    {!failure && (
                        <button type="button" className={s.skip} onClick={() => setSkipped(true)}>
                            Skip animation <kbd aria-hidden>Esc</kbd>
                        </button>
                    )}
                </header>

                {fc && failure ? (
                    <div className="grid place-items-center">
                        <div className={s.failure} role="alert">
                            <span aria-hidden className="grid size-11 place-items-center rounded-nv-sm border border-nv-danger-edge bg-nv-danger-wash text-nv-danger">
                                {fc.icon}
                            </span>
                            <h1 className="nv-display mt-4 text-nv-display-md text-balance">{fc.title}</h1>
                            <p className="mt-2 text-nv-body text-nv-ivory-200 text-pretty">{fc.body}</p>
                            {failure.message && failure.message !== fc.title && <p className="mt-3 break-words rounded-nv-xs bg-nv-graphite-850 px-2 py-1 font-mono text-nv-micro text-nv-ivory-300">{failure.message}</p>}
                            <div className="mt-6 flex flex-wrap gap-3">
                                <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-2 rounded-nv-sm bg-nv-copper-500 px-5 text-nv-body font-medium text-nv-on-accent shadow-nv-accent transition-colors hover:bg-nv-copper-300">
                                    <RefreshCw className="size-4" aria-hidden /> Retry
                                </button>
                                <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-nv-sm border border-nv-graphite-600 bg-nv-graphite-900 px-5 text-nv-body font-medium text-nv-ivory-100 hover:border-nv-graphite-500">
                                    Search another <ArrowRight className="size-4" aria-hidden />
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={s.stageArea}>
                        <div className={s.title}>
                            <p className="nv-eyebrow">{kind === "profile" ? "Entering the GitHub universe" : "Opening the repository"}</p>
                            <h1 className={`${s.subject} nv-display`}>
                                {head && <span className="text-nv-ivory-300">{head}</span>}
                                <span className="nv-gradient-text">{kind === "profile" ? `@${tail}` : tail}</span>
                            </h1>
                            <p className={s.lead}>Every figure here is read from GitHub as it arrives. Nothing is estimated.</p>
                        </div>
                        <aside className={s.panel} aria-label="Analysis milestones">
                            <ul className={s.milestones} aria-hidden>
                                {stages.map((st) => (
                                    <li key={st.id} data-state={st.status} />
                                ))}
                            </ul>
                            <StageList stages={stages} still={reduced} />
                        </aside>
                    </div>
                )}

                <footer className={s.statusBar}>
                    <p role="status" aria-live="polite" className={`${s.status} truncate`}>
                        {line}
                    </p>
                    <span className={s.count}>
                        {done} of {stages.length} milestones
                    </span>
                </footer>
            </div>
        </div>
    );
}
