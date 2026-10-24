"use client";

import { useState } from "react";
import { Check, Copy, Eye, FileCode } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import type { Components } from "react-markdown";

import { EnhancedMarkdown } from "./EnhancedMarkdown";

interface CodeBlockProps {
    language: string;
    value: string;
    components?: Components;
    owner?: string;
    repo?: string;
}

// Semantic colors keep code readable on the light mineral canvas.
const NV_PRISM: Record<string, React.CSSProperties> = {
    'code[class*="language-"]': { color: "var(--nv-ivory-100)", fontFamily: "var(--nv-font-mono)", textShadow: "none" },
    'pre[class*="language-"]': { color: "var(--nv-ivory-100)", fontFamily: "var(--nv-font-mono)", textShadow: "none" },
    comment: { color: "var(--nv-graphite-400)", fontStyle: "italic" },
    prolog: { color: "var(--nv-graphite-400)" },
    punctuation: { color: "var(--nv-ivory-300)" },
    keyword: { color: "var(--nv-copper-400)" },
    "attr-name": { color: "var(--nv-copper-300)" },
    function: { color: "var(--nv-ivory-50)" },
    "class-name": { color: "var(--nv-ivory-50)" },
    string: { color: "var(--nv-patina-400)" },
    "attr-value": { color: "var(--nv-patina-400)" },
    number: { color: "var(--nv-warning)" },
    boolean: { color: "var(--nv-warning)" },
    operator: { color: "var(--nv-ivory-200)" },
};

export function CodeBlock({ language, value, components, owner, repo }: CodeBlockProps) {
    const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
    const [preview, setPreview] = useState(false);
    const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopy("copied");
        } catch {
            setCopy("failed");
        }
        setTimeout(() => setCopy("idle"), 2000);
    };

    const isMarkdown = language === "markdown";
    const btn =
        "inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-nv-sm px-2.5 text-nv-small text-nv-ivory-200 transition-colors hover:bg-nv-graphite-800 hover:text-nv-ivory-50 disabled:opacity-45";

    return (
        <figure className="not-prose relative my-4 grid min-w-0 max-w-full overflow-hidden rounded-nv-lg border border-nv-graphite-600 bg-nv-graphite-800">
            <figcaption className="flex min-h-11 items-center justify-between gap-2 border-b border-nv-graphite-700 bg-nv-graphite-950 pl-4">
                <span className="nv-eyebrow">{language || "text"}</span>
                <span className="flex items-center">
                    {isMarkdown && (
                        <button type="button" onClick={() => setPreview(!preview)} className={btn} aria-pressed={preview}>
                            {preview ? <FileCode aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                            {preview ? "Raw" : "Preview"}
                        </button>
                    )}
                    <button type="button" onClick={handleCopy} disabled={!canCopy} className={btn} aria-label="Copy code">
                        {copy === "copied" ? <Check aria-hidden className="size-4 text-nv-success" /> : <Copy aria-hidden className="size-4" />}
                        <span aria-live="polite">{copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed" : "Copy"}</span>
                    </button>
                </span>
            </figcaption>

            {preview ? (
                <div className="w-full min-w-0 overflow-x-auto p-4">
                    <EnhancedMarkdown content={value} components={components} currentOwner={owner} currentRepo={repo} />
                </div>
            ) : (
                <div role="region" tabIndex={0} aria-label={`${language || "text"} code`} className="w-full min-w-0 overflow-x-auto">
                    <SyntaxHighlighter
                        language={language}
                        style={NV_PRISM}
                        customStyle={{ margin: 0, padding: "1rem", background: "transparent", fontSize: "0.8125rem", lineHeight: "1.6", whiteSpace: "pre" }}
                        wrapLines={false}
                        wrapLongLines={false}
                    >
                        {value}
                    </SyntaxHighlighter>
                </div>
            )}
        </figure>
    );
}
