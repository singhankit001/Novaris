"use client";

import { useMemo, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { FileCode2 } from "lucide-react";
import { RepoCard } from "./RepoCard";
import { DeveloperCard } from "./DeveloperCard";
import { SmartLink } from "./SmartLink";
import { Mermaid } from "./Mermaid";
import { FolderIcon } from "./FileIcon";
import { generateMermaidFromJSON } from "@/lib/diagram-utils";
import { classifyInlinePath, resolveRepoPath } from "@/lib/markdown-utils";

interface ParsedContent {
    type: "markdown" | "repo-card" | "developer-card";
    content: string | Record<string, string>;
}

/** Split text into markdown fragments and the `:::repo-card` / `:::developer-card` blocks the model can emit. */
export function parseCardContent(text: string): ParsedContent[] {
    const parts: ParsedContent[] = [];
    let currentIndex = 0;
    const cardRegex = /:::(repo-card|developer-card)\n([\s\S]*?):::/g;
    let match: RegExpExecArray | null;

    while ((match = cardRegex.exec(text)) !== null) {
        if (match.index > currentIndex) {
            const markdown = text.slice(currentIndex, match.index).trim();
            if (markdown) parts.push({ type: "markdown", content: markdown });
        }
        const cardData: Record<string, string> = {};
        match[2].split("\n").forEach((line) => {
            const [key, ...rest] = line.split(":");
            if (key && rest.length) cardData[key.trim()] = rest.join(":").trim();
        });
        parts.push({ type: match[1] as "repo-card" | "developer-card", content: cardData });
        currentIndex = match.index + match[0].length;
    }

    if (currentIndex < text.length) {
        const markdown = text.slice(currentIndex).trim();
        if (markdown) parts.push({ type: "markdown", content: markdown });
    }
    return parts;
}

interface EnhancedMarkdownProps {
    content: string;
    components?: Components;
    currentOwner?: string;
    currentRepo?: string;
    isStreaming?: boolean;
    fileTree?: { path: string }[];
}

type El<T extends keyof React.JSX.IntrinsicElements> = ComponentPropsWithoutRef<T>;

const inlinePathClass =
    "group/cite mx-px inline-flex min-h-6 max-w-full cursor-pointer items-baseline gap-1 rounded-md border border-nv-copper-700 bg-nv-copper-wash px-1.5 py-px align-baseline font-nv-mono text-[0.82em] leading-[1.5] text-nv-copper-300 transition-[background-color,border-color,box-shadow] duration-150 hover:border-nv-copper-600 hover:bg-white hover:shadow-nv-xs";

interface InlineCodeProps extends El<"code"> {
    text: string;
    fileTree: { path: string }[];
    hasLanguage: boolean;
}

/** `src/app.ts:12-30` -> path plus an optional line range. */
function splitLineRange(text: string): { path: string; lines?: string } {
    const match = /^(.*?):(\d+(?:-\d+)?)$/.exec(text);
    return match?.[1] && match[2] ? { path: match[1], lines: match[2] } : { path: text };
}

/** Inline code. When it names a file or folder that exists in the repository tree it becomes a citation chip. */
export function InlineCode({ text, fileTree, hasLanguage, className, children, ...rest }: InlineCodeProps) {
    const { path, lines } = splitLineRange(text);
    const kind = hasLanguage ? null : classifyInlinePath(path);
    if (kind === "file") {
        const full = resolveRepoPath(path, false, fileTree);
        if (fileTree.some((f) => f.path === full)) {
            return (
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("open-file-preview", { detail: lines ? { path: full, lines } : full }))} className={inlinePathClass} title={`Open ${full}${lines ? ` at lines ${lines}` : ""}`}>
                    <FileCode2 aria-hidden className="size-3.5 translate-y-[0.15em] shrink-0" />
                    <span className="min-w-0 truncate">{path}</span>
                    {lines && <span className="nv-num rounded bg-nv-copper-400/10 px-1 text-[0.9em] text-nv-copper-400">L{lines}</span>}
                </button>
            );
        }
    }
    if (kind === "folder") {
        const folder = resolveRepoPath(path.endsWith("/") ? path.slice(0, -1) : path, true, fileTree);
        if (fileTree.some((f) => f.path === folder || f.path.startsWith(`${folder}/`))) {
            return (
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("reveal-folder", { detail: folder }))} className={inlinePathClass} title={`Reveal ${folder}`}>
                    <FolderIcon name={text} isExpanded={false} className="size-3.5 shrink-0 translate-y-[0.15em]" />
                    <span className="min-w-0 truncate">{text}</span>
                </button>
            );
        }
    }
    return (
        <code className={className || "rounded-md border border-nv-graphite-700 bg-nv-graphite-850 px-1.5 py-px font-nv-mono text-[0.84em] text-nv-ivory-50"} {...rest}>
            {children}
        </code>
    );
}

/** Markdown for untrusted model and repository text. Raw HTML is parsed then sanitized; the order matters. */
export function EnhancedMarkdown({ content, components, currentOwner, currentRepo, isStreaming = false, fileTree = [] }: EnhancedMarkdownProps) {
    const parts = useMemo(() => parseCardContent(content), [content]);

    const mergedComponents = useMemo<Components>(
        () => ({
            a: (props: El<"a">) => <SmartLink {...props} currentOwner={currentOwner} currentRepo={currentRepo} />,
            img: ({ src, alt, width, height }: El<"img">) => {
                if (!src || typeof src !== "string") return null;
                // eslint-disable-next-line @next/next/no-img-element
                return <img src={src} alt={alt || ""} width={width} height={height} loading="lazy" className="my-6 h-auto max-w-full rounded-nv-lg border border-nv-graphite-700 shadow-nv-card" />;
            },
            code(props: El<"code"> & { node?: unknown }) {
                const { children, className, node, ...rest } = props;
                void node;
                const match = /language-([\w-]+)/.exec(className || "");
                const text = String(children).replace(/\n$/, "");

                if (match?.[1] === "mermaid") return <Mermaid chart={text} isStreaming={isStreaming} />;
                if (match?.[1] === "svg") {
                    return (
                        <div className="my-4 rounded-nv-md border border-nv-warning-edge bg-nv-warning-wash p-3">
                            <p className="mb-2 text-nv-small text-nv-warning">SVG is shown as source, not rendered.</p>
                            <pre className="overflow-x-auto whitespace-pre-wrap rounded-nv-sm bg-nv-graphite-950 p-3 font-mono text-nv-micro text-nv-ivory-200">{text}</pre>
                        </div>
                    );
                }
                if (match?.[1] === "mermaid-json") {
                    try {
                        const chart = generateMermaidFromJSON(JSON.parse(text));
                        if (chart) return <Mermaid chart={chart} isStreaming={isStreaming} />;
                    } catch {
                        // Show the raw JSON below.
                    }
                    return <pre className="my-4 overflow-x-auto whitespace-pre-wrap rounded-nv-sm bg-nv-graphite-950 p-3 font-mono text-nv-micro text-nv-ivory-200">{text}</pre>;
                }

                return <InlineCode text={text} className={className} fileTree={fileTree} hasLanguage={Boolean(match)} {...rest}>{children}</InlineCode>;
            },
            p: ({ children }: El<"p">) => <div className="mb-[1.1em] text-pretty last:mb-0">{children}</div>,
            h1: ({ children }: El<"h1">) => <h3 className="nv-display mb-3 mt-10 text-[1.5rem] leading-[1.15] text-nv-ivory-50 first:mt-0">{children}</h3>,
            h2: ({ children }: El<"h2">) => (
                <h4 className="nv-display mb-3 mt-9 flex items-center gap-3 text-[1.1875rem] leading-[1.25] tracking-[-0.025em] text-nv-ivory-50 first:mt-0">
                    <span aria-hidden className="h-4 w-1 shrink-0 rounded-full bg-[image:var(--nv-gradient-signal)]" />
                    <span className="min-w-0 text-balance">{children}</span>
                </h4>
            ),
            h3: ({ children }: El<"h3">) => <h5 className="mb-2 mt-7 text-[1rem] font-semibold tracking-[-0.015em] text-nv-ivory-50 first:mt-0">{children}</h5>,
            h4: ({ children }: El<"h4">) => <h6 className="nv-eyebrow mb-2 mt-6 first:mt-0">{children}</h6>,
            ul: ({ children }: El<"ul">) => <ul className="mb-[1.1em] list-disc space-y-1.5 pl-[1.35em] marker:text-nv-copper-400">{children}</ul>,
            ol: ({ children }: El<"ol">) => <ol className="mb-[1.1em] list-decimal space-y-1.5 pl-[1.6em] marker:font-nv-mono marker:text-[0.82em] marker:text-nv-ivory-300">{children}</ol>,
            li: ({ children }: El<"li">) => <li className="pl-1 [&>div]:mb-1.5 [&>ol]:mt-1.5 [&>ul]:mt-1.5 [&>ul]:mb-0 [&>ol]:mb-0">{children}</li>,
            blockquote: ({ children }: El<"blockquote">) => (
                <blockquote className="my-6 rounded-r-nv-md border-l-2 border-nv-violet-400 bg-gradient-to-r from-nv-violet-wash to-transparent py-3 pl-5 pr-4 font-nv-serif text-[1.125rem] italic leading-[1.55] text-nv-ivory-100 [&>div]:mb-0">
                    {children}
                </blockquote>
            ),
            hr: () => <hr className="my-8 h-px border-0 bg-gradient-to-r from-transparent via-nv-graphite-600 to-transparent" />,
            strong: ({ children }: El<"strong">) => <strong className="font-semibold text-nv-ivory-50">{children}</strong>,
            em: ({ children }: El<"em">) => <em className="font-nv-serif text-[1.06em] italic">{children}</em>,
            table: ({ children }: El<"table">) => (
                <div role="region" tabIndex={0} aria-label="Table" className="my-6 overflow-x-auto rounded-nv-lg border border-nv-graphite-700 bg-nv-graphite-900 shadow-nv-card">
                    <table className="nv-num w-full border-collapse text-left text-nv-small">{children}</table>
                </div>
            ),
            thead: ({ children }: El<"thead">) => <thead className="bg-gradient-to-b from-white to-nv-graphite-850">{children}</thead>,
            tr: ({ children }: El<"tr">) => <tr className="transition-colors hover:bg-nv-graphite-800/70 [&:last-child>td]:border-b-0">{children}</tr>,
            th: ({ children }: El<"th">) => <th scope="col" className="nv-eyebrow whitespace-nowrap border-b border-nv-graphite-700 px-4 py-2.5 font-normal">{children}</th>,
            td: ({ children }: El<"td">) => <td className="border-b border-nv-graphite-700 px-4 py-2.5 align-top text-nv-ivory-100">{children}</td>,
            ...components,
        }),
        [currentOwner, currentRepo, components, fileTree, isStreaming],
    );

    return (
        <>
            {parts.map((part, index) => {
                if (part.type === "markdown") {
                    return (
                        <ReactMarkdown key={index} components={mergedComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                            {part.content as string}
                        </ReactMarkdown>
                    );
                }
                const data = part.content as Record<string, string>;
                if (part.type === "repo-card") {
                    const sameUser = currentOwner?.toLowerCase() === data.owner?.toLowerCase();
                    if (sameUser && currentRepo?.toLowerCase() === data.name?.toLowerCase()) return null;
                    return (
                        <RepoCard
                            key={index}
                            owner={data.owner || ""}
                            name={data.name || ""}
                            description={data.description}
                            stars={data.stars ? parseInt(data.stars) : undefined}
                            forks={data.forks ? parseInt(data.forks) : undefined}
                            language={data.language}
                        />
                    );
                }
                if (currentOwner?.toLowerCase() === data.username?.toLowerCase() && !currentRepo) return null;
                return <DeveloperCard key={index} username={data.username || ""} name={data.name} avatar={data.avatar} bio={data.bio} location={data.location} blog={data.blog} />;
            })}
        </>
    );
}
