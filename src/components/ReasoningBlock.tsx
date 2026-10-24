"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
    return clean.length > 60 ? `${clean.substring(0, 60)}...` : clean;
}

/** Model reasoning summary (Thinking mode). Collapsed to the current step; expand for the whole list. */
export function ReasoningBlock({ steps, isStreaming }: ReasoningBlockProps) {
    const uid = useId();
    const [expanded, setExpanded] = useState(false);
    const shown = (steps || []).filter((s) => !s.startsWith("Reasoning:") && !s.startsWith("Process:") && !s.startsWith("STATUS:"));
    const hasSteps = shown.length > 0;

    if (!hasSteps && !isStreaming) return null;
    if (!hasSteps) {
        return (
            <p role="status" className="not-prose nv-eyebrow flex min-h-11 items-center">
                Thinking
            </p>
        );
    }

    const current = shown[shown.length - 1];
    return (
        <div className="not-prose mb-3 w-full min-w-0 rounded-nv-md border border-nv-graphite-600 bg-nv-graphite-950 px-4 py-2">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={`${uid}-steps`}
                className="group flex min-h-11 w-full min-w-0 touch-manipulation flex-col items-start justify-center gap-1 text-left"
            >
                <span className="flex items-center gap-2">
                    <span className="nv-eyebrow">{isStreaming ? "Thinking" : "Reasoned"}</span>
                    <ChevronDown aria-hidden className={cn("size-3.5 text-nv-ivory-300 transition-transform duration-150", expanded && "rotate-180")} />
                </span>
                {!expanded && current && (
                    <span className="w-full min-w-0 pr-2 text-nv-small text-nv-ivory-200 whitespace-normal break-words [overflow-wrap:anywhere] sm:truncate sm:whitespace-nowrap sm:pr-4">
                        {currentStepTitle(current)}
                    </span>
                )}
            </button>
            {expanded && (
                <ol id={`${uid}-steps`} className="nv-fade m-0 mt-1 list-none space-y-3 border-l border-nv-graphite-600 pl-3 text-nv-small">
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
