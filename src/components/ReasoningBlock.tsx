"use client";

import { useId, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import s from "./chat/chat.module.css";

interface ReasoningBlockProps {
    steps: string[];
    isStreaming?: boolean;
}

function formatStep(step: string) {
    const match = step.match(/^\*\*([^*]+)\*\*([\s\S]*)/);
    if (!match) return step;
    return (
        <div>
            <span className="font-medium text-nv-ivory-100">{match[1]}</span>
            {match[2] && <div className="mt-1">{match[2].trim()}</div>}
        </div>
    );
}

function currentStepTitle(step: string) {
    const match = step.match(/^\*\*([^*]+)\*\*/);
    if (match) return match[1];
    const clean = step.replace(/^(Reasoning|Process|STATUS):\s*/, "");
    return clean.length > 90 ? `${clean.substring(0, 90)}...` : clean;
}

/** Model reasoning summary (Thinking mode). Collapsed to the current step; expand for the whole list. */
export function ReasoningBlock({ steps, isStreaming }: ReasoningBlockProps) {
    const uid = useId();
    const [expanded, setExpanded] = useState(false);
    const shown = (steps || []).filter((st) => !st.startsWith("Reasoning:") && !st.startsWith("Process:") && !st.startsWith("STATUS:"));
    const hasSteps = shown.length > 0;

    if (!hasSteps && !isStreaming) return null;
    if (!hasSteps) {
        return (
            <p role="status" className="not-prose mb-4 flex min-h-8 items-center gap-3 text-nv-small font-medium text-nv-violet-600">
                <span aria-hidden className={s.orb} />
                <span className={s.shimmer}>Thinking</span>
            </p>
        );
    }

    const current = shown[shown.length - 1];
    return (
        <div className="not-prose mb-5 w-full min-w-0 overflow-hidden rounded-nv-lg border border-nv-violet-400/20 bg-gradient-to-b from-nv-violet-wash to-white shadow-nv-xs">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={`${uid}-steps`}
                className="group flex min-h-11 w-full min-w-0 touch-manipulation items-center gap-3 px-4 py-2 text-left"
            >
                {isStreaming ? <span aria-hidden className={cn(s.orb, "shrink-0")} /> : <Sparkles aria-hidden className="size-4 shrink-0 text-nv-violet-400" />}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="nv-eyebrow !text-nv-violet-600">{isStreaming ? "Thinking" : `Reasoned in ${shown.length} step${shown.length === 1 ? "" : "s"}`}</span>
                    {!expanded && current && (
                        <span className="w-full min-w-0 whitespace-normal break-words text-nv-small text-nv-ivory-200 [overflow-wrap:anywhere] sm:truncate sm:whitespace-nowrap">{currentStepTitle(current)}</span>
                    )}
                </span>
                <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-nv-ivory-300 transition-transform duration-150", expanded && "rotate-180")} />
            </button>
            {expanded && (
                <ol id={`${uid}-steps`} className="nv-fade m-0 mx-4 mb-4 mt-1 list-none space-y-3 border-l border-nv-violet-400/30 pl-4 text-nv-small">
                    {shown.map((step, i) => (
                        <li key={i} className={cn("min-w-0 break-words", i === shown.length - 1 && isStreaming ? "text-nv-ivory-100" : "text-nv-ivory-300")}>
                            {formatStep(step)}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
