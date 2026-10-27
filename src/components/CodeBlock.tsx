"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, Copy, Eye, FileCode } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import type { Components } from "react-markdown";

import { cn } from "@/lib/utils";
import { EnhancedMarkdown } from "./EnhancedMarkdown";

interface CodeBlockProps {
    language: string;
    value: string;
    components?: Components;
    owner?: string;
    repo?: string;
    /** Overrides the file name read from a leading path comment. */
    filename?: string;
    /** false shows every line without the "Show all" fold (file viewer). Default true. */
    collapse?: boolean;
    /** Inclusive 1-based line range to mark, e.g. a cited range. Numbers the lines. */
    highlight?: [number, number];
}

/** Light syntax theme: electric blue keywords, violet functions, ion strings, ink text. */
const NV_PRISM: Record<string, React.CSSProperties> = {
    'code[class*="language-"]': { color: "#14161d", fontFamily: "var(--nv-font-mono)", textShadow: "none", background: "none" },
    'pre[class*="language-"]': { color: "#14161d", fontFamily: "var(--nv-font-mono)", textShadow: "none", background: "none" },
    comment: { color: "#7b8191", fontStyle: "italic" },
    prolog: { color: "#7b8191" },
    doctype: { color: "#7b8191" },
    cdata: { color: "#7b8191" },
    punctuation: { color: "#5a5f6e" },
    operator: { color: "#5a5f6e" },
    keyword: { color: "#2f54ff" },
    atrule: { color: "#2f54ff" },
    tag: { color: "#2f54ff" },
    selector: { color: "#2f54ff" },
    "attr-name": { color: "#5b2fe0" },
    property: { color: "#14161d" },
    function: { color: "#5b2fe0" },
    "function-variable": { color: "#5b2fe0" },
    "class-name": { color: "#5b2fe0" },
    builtin: { color: "#5b2fe0" },
    namespace: { color: "#5a5f6e" },
    string: { color: "#0a7aa3" },
    char: { color: "#0a7aa3" },
    "attr-value": { color: "#0a7aa3" },
    "template-string": { color: "#0a7aa3" },
    url: { color: "#0a7aa3" },
    number: { color: "#9a5a00" },
    boolean: { color: "#9a5a00" },
    constant: { color: "#9a5a00" },
    symbol: { color: "#9a5a00" },
    regex: { color: "#b0306f" },
    important: { color: "#b0306f", fontWeight: "600" },
    deleted: { color: "#c22c25" },
    inserted: { color: "#11744a" },
    variable: { color: "#14161d" },
};

const COLLAPSE_LINES = 28;
const NUMBER_LINES_FROM = 8;

const LANGUAGE_LABEL: Record<string, string> = {
    ts: "TypeScript", typescript: "TypeScript", tsx: "TSX", js: "JavaScript", javascript: "JavaScript", jsx: "JSX",
    py: "Python", python: "Python", rs: "Rust", rust: "Rust", go: "Go", rb: "Ruby", java: "Java", sh: "Shell", bash: "Shell",
    shell: "Shell", json: "JSON", yaml: "YAML", yml: "YAML", css: "CSS", html: "HTML", sql: "SQL", md: "Markdown",
    markdown: "Markdown", toml: "TOML", diff: "Diff", c: "C", cpp: "C++", svg: "SVG", text: "Text",
};

const LANGUAGE_DOT: Record<string, string> = {
    ts: "#2f54ff", typescript: "#2f54ff", tsx: "#2f54ff", js: "#9a5a00", javascript: "#9a5a00", jsx: "#9a5a00",
    py: "#0a7aa3", python: "#0a7aa3", rs: "#b0306f", rust: "#b0306f", go: "#19b6e6", sh: "#11744a", bash: "#11744a",
    json: "#7a4dff", css: "#7a4dff", html: "#b0306f", sql: "#0a7aa3",
};

/** `// src/app/page.tsx` or `# config/app.yml` on the first line names the file. */
function readFilename(value: string): { filename?: string; body: string } {
    const [first = "", ...rest] = value.split("\n");
    const match = /^\s*(?:\/\/|#|\/\*|<!--)\s*([\w@./()[\]-]+\.[A-Za-z0-9]{1,8})\s*(?:\*\/|-->)?\s*$/.exec(first);
    if (!match?.[1]) return { body: value };
    return { filename: match[1], body: rest.join("\n").replace(/^\n/, "") };
}

export function CodeBlock({ language, value, components, owner, repo, filename, collapse = true, highlight }: CodeBlockProps) {
    const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
    const [preview, setPreview] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const canCopy = useSyncExternalStore(
        () => () => {},
        () => Boolean(navigator.clipboard),
        () => false,
    );

    const read = filename ? { filename, body: value } : readFilename(value);
    const lines = read.body.split("\n").length;
    const long = collapse && lines > COLLAPSE_LINES;
    const lang = (language || "text").toLowerCase();
    const label = LANGUAGE_LABEL[lang] ?? lang;
    const isMarkdown = lang === "markdown" || lang === "md";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopy("copied");
        } catch {
            setCopy("failed");
        }
        setTimeout(() => setCopy("idle"), 2000);
    };

    const btn =
        "inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-nv-sm px-2.5 text-nv-small text-nv-ivory-200 transition-colors hover:bg-nv-graphite-850 hover:text-nv-ivory-50 disabled:opacity-45";

    return (
        <figure className="not-prose group/code relative my-6 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] overflow-hidden rounded-nv-lg border border-nv-graphite-700 bg-nv-graphite-900 shadow-nv-card">
            <figcaption className="flex min-h-11 items-center justify-between gap-2 border-b border-nv-graphite-700 bg-gradient-to-b from-white to-nv-graphite-850 pl-4">
                <span className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: LANGUAGE_DOT[lang] ?? "#868b99" }} />
                    <span className="nv-eyebrow shrink-0">{label}</span>
                    {read.filename && (
                        <>
                            <span aria-hidden className="h-3.5 w-px shrink-0 bg-nv-graphite-600" />
                            <span className="truncate font-nv-mono text-nv-micro text-nv-ivory-200" title={read.filename}>{read.filename}</span>
                        </>
                    )}
                </span>
                <span className="flex shrink-0 items-center">
                    {isMarkdown && (
                        <button type="button" onClick={() => setPreview(!preview)} className={btn} aria-pressed={preview}>
                            {preview ? <FileCode aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                            {preview ? "Raw" : "Preview"}
                        </button>
                    )}
                    <button type="button" onClick={handleCopy} disabled={!canCopy} className={cn(btn, copy === "copied" && "text-nv-success")} aria-label={read.filename ? `Copy ${read.filename}` : "Copy code"}>
                        {copy === "copied" ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
                        <span aria-live="polite" className="min-w-10 text-left">{copy === "copied" ? "Copied" : copy === "failed" ? "Failed" : "Copy"}</span>
                    </button>
                </span>
            </figcaption>

            {preview ? (
                <div className="w-full min-w-0 overflow-x-auto p-5">
                    <EnhancedMarkdown content={value} components={components} currentOwner={owner} currentRepo={repo} />
                </div>
            ) : (
                <div className="relative">
                    <div
                        role="region"
                        tabIndex={0}
                        aria-label={`${label} code${read.filename ? ` from ${read.filename}` : ""}`}
                        className={cn("w-full min-w-0 overflow-x-auto bg-[#fcfcfe]", long && !expanded && "max-h-[34rem] overflow-y-hidden")}
                    >
                        <SyntaxHighlighter
                            language={lang}
                            style={NV_PRISM}
                            showLineNumbers={lines >= NUMBER_LINES_FROM || Boolean(highlight)}
                            lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1.1em", color: "#9aa0ae", textAlign: "right", fontStyle: "normal", userSelect: "none", fontVariantNumeric: "tabular-nums" }}
                            customStyle={{ margin: 0, padding: "1rem 1.1rem", background: "transparent", fontSize: "0.8125rem", lineHeight: "1.7", whiteSpace: "pre" }}
                            codeTagProps={{ style: { fontFamily: "var(--nv-font-mono)", fontVariantLigatures: "none" } }}
                            wrapLines={Boolean(highlight)}
                            lineProps={(n: number) => ({
                                style: highlight && n >= highlight[0] && n <= highlight[1] ? { display: "block", background: "var(--nv-copper-wash)", boxShadow: "inset 2px 0 0 var(--nv-copper-400)" } : { display: "block" },
                            })}
                            wrapLongLines={false}
                        >
                            {read.body}
                        </SyntaxHighlighter>
                    </div>
                    {long && !expanded && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-28 items-end justify-center bg-gradient-to-t from-[#fcfcfe] via-[#fcfcfe]/90 to-transparent pb-3">
                            <button type="button" onClick={() => setExpanded(true)} className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-nv-graphite-600 bg-white px-4 text-nv-small font-medium text-nv-ivory-100 shadow-nv-xs transition-colors hover:border-nv-copper-600 hover:text-nv-copper-300">
                                <ChevronDown aria-hidden className="size-4" /> Show all {lines.toLocaleString()} lines
                            </button>
                        </div>
                    )}
                </div>
            )}
        </figure>
    );
}
