"use client";

import { motion, useReducedMotion } from "framer-motion";

interface StreamingProgressProps {
    message: string;
    /** 0..100, supplied by the caller from real work. */
    progress: number;
}

export function StreamingProgress({ message, progress }: StreamingProgressProps) {
    const reducedMotion = useReducedMotion();
    const percent = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
    return (
        <div className="flex w-full max-w-full flex-col gap-2 overflow-hidden">
            <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-nv-copper-400 motion-safe:animate-pulse" />
                <span className="min-w-0 flex-1 truncate text-nv-small text-nv-ivory-200">{message}</span>
                <span className="nv-num text-nv-micro text-nv-ivory-300">{Math.round(percent)}%</span>
            </div>
            <div role="progressbar" aria-label={message} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-nv-graphite-700">
                <motion.div
                    className="h-full origin-left rounded-full"
                    style={{ background: "var(--nv-gradient-signal)" }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: percent / 100 }}
                    transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}
