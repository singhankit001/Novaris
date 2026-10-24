"use client";

import { useMemo, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { ArrowUpRight } from "lucide-react";
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
    "inline-flex min-h-6 cursor-pointer items-baseline gap-1 rounded-nv-xs bg-transparent p-0 font-mono text-nv-small text-nv-copper-300 underline decoration-dashed decoration-nv-copper-600 underline-offset-[3px] hover:text-nv-copper-300 hover:decoration-nv-copper-400";


interface InlineCodeProps extends El<"code"> {
    text: string;
    fileTree: { path: string }[];
    hasLanguage: boolean;
}

/** Inline code. When it names a file or folder that exists in the repository tree it becomes a button. */
export function InlineCode({ text, fileTree, hasLanguage, className, children, ...rest }: InlineCodeProps) {
    const kind = hasLanguage ? null : classifyInlinePath(text);
    if (kind === "file") {
        const full = resolveRepoPath(text, false, fileTree);
        if (fileTree.some((f) => f.path === full)) {
            return (
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("open-file-preview", { detail: full }))} className={inlinePathClass} title={`Open ${full}`}>
                    <ArrowUpRight aria-hidden className="size-3.5" />
                    {children}
                </button>
            );
        }
    }
    if (kind === "folder") {
        const folder = resolveRepoPath(text.endsWith("/") ? text.slice(0, -1) : text, true, fileTree);
        if (fileTree.some((f) => f.path === folder || f.path.startsWith(`${folder}/`))) {
            return (
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("reveal-folder", { detail: folder }))} className={inlinePathClass} title={`Reveal ${folder}`}>
                    <FolderIcon name={text} isExpanded={false} className="size-3.5" />
                    {children}
                </button>
            );
        }
    }
    return (
        <code className={className || "rounded-nv-xs border border-nv-graphite-700 bg-nv-graphite-850 px-1.5 py-0.5 font-mono text-[0.85em] text-nv-ivory-100"} {...rest}>
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
                return <img src={src} alt={alt || ""} width={width} height={height} loading="lazy" className="my-4 h-auto max-w-full rounded-nv-sm border border-nv-graphite-700" />;
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
            p: ({ children }: El<"p">) => <div className="mb-4 leading-relaxed last:mb-0">{children}</div>,
            h1: ({ children }: El<"h1">) => <h3 className="nv-display mb-3 mt-6 text-nv-title text-nv-ivory-50 first:mt-0">{children}</h3>,
            h2: ({ children }: El<"h2">) => <h4 className="nv-display mb-3 mt-6 text-nv-title text-nv-ivory-50 first:mt-0">{children}</h4>,
            h3: ({ children }: El<"h3">) => <h5 className="mb-2 mt-5 text-nv-body font-medium text-nv-ivory-50 first:mt-0">{children}</h5>,
            h4: ({ children }: El<"h4">) => <h6 className="mb-2 mt-4 text-nv-body font-medium text-nv-ivory-100 first:mt-0">{children}</h6>,
            ul: ({ children }: El<"ul">) => <ul className="mb-4 list-disc space-y-1 pl-5 marker:text-nv-graphite-500">{children}</ul>,
            ol: ({ children }: El<"ol">) => <ol className="mb-4 list-decimal space-y-1 pl-5 marker:text-nv-ivory-300">{children}</ol>,
            blockquote: ({ children }: El<"blockquote">) => <blockquote className="my-4 border-l-2 border-nv-copper-600 pl-4 text-nv-ivory-200">{children}</blockquote>,
            hr: () => <hr className="my-6 border-nv-graphite-700" />,
            strong: ({ children }: El<"strong">) => <strong className="font-semibold text-nv-ivory-50">{children}</strong>,
            table: ({ children }: El<"table">) => (
                <div role="region" tabIndex={0} aria-label="Table" className="my-4 overflow-x-auto rounded-nv-md border border-nv-graphite-700">
                    <table className="w-full border-collapse text-left text-nv-small">{children}</table>
                </div>
            ),
            th: ({ children }: El<"th">) => <th scope="col" className="nv-eyebrow border-b border-nv-graphite-700 bg-nv-graphite-850 px-3 py-2 font-normal">{children}</th>,
            td: ({ children }: El<"td">) => <td className="border-b border-nv-graphite-700 px-3 py-2 align-top text-nv-ivory-100">{children}</td>,
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
