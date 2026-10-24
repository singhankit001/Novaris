"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface StreamingProgressProps {
    message: string;
    progress: number;
}

export function StreamingProgress({ message, progress }: StreamingProgressProps) {
    const reducedMotion = useReducedMotion();
    const percent = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
    return (
        <div className="flex flex-col gap-2 w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="w-4 h-4 motion-safe:animate-spin text-nv-copper-400 shrink-0" />
                <span className="text-sm text-nv-ivory-200 truncate flex-1 min-w-0">{message}</span>
            </div>

            {/* Progress bar */}
            <div role="progressbar" aria-label={message} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="w-full h-1.5 bg-nv-graphite-700 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-nv-copper-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}
