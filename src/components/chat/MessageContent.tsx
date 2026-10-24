import { type HTMLAttributes, type ReactNode } from "react";

import { EnhancedMarkdown, InlineCode } from "@/components/EnhancedMarkdown";
import { Mermaid } from "@/components/Mermaid";
import { CodeBlock } from "@/components/CodeBlock";
import { compileMermaidFromJSON } from "@/lib/diagram-utils";
import { repairMarkdown } from "@/lib/markdown-utils";
import { Spinner } from "@/components/nv/skeleton";

interface MessageContentProps {
    content: string;
    messageId: string;
    messages?: { id: string }[];
    currentOwner?: string;
    currentRepo?: string;
    isStreaming?: boolean;
    fileTree?: { path: string }[];
}

interface MarkdownCodeProps extends HTMLAttributes<HTMLElement> {
    className?: string;
    children?: ReactNode;
    inline?: boolean;
}

function stripEliteSvgBanner(content: string): string {
    return content
        .replace(/(?:^|\n)\s*Applying Elite SVG 2\.0 System:\s*\[✓\]\s*Smooth SMIL Splines\s*\[✓\]\s*Precise Bead Math\s*\[✓\]\s*Premium Defs Applied\.?\s*(?:\n|$)/gi, "\n")
        .trimStart();
}

const EMPTY_TREE: { path: string }[] = [];

function MessageContentBase({ content, currentOwner, currentRepo, isStreaming = false, fileTree = EMPTY_TREE }: MessageContentProps) {
    const repaired = repairMarkdown(stripEliteSvgBanner(content));

    const components = {
        code: ({ className, children, inline, ...props }: MarkdownCodeProps) => {
            const match = /language-([\w-]+)/.exec(className ?? "");
            const language = (match?.[1] ?? "").toLowerCase();
            const raw = String(children ?? "").replace(/\n$/, "");
            const trimmed = raw.trim();
            const looksLikeDiagramJson =
                trimmed.startsWith("{") &&
                (/"diagramType"\s*:\s*"/.test(trimmed) ||
                    (/"nodes"\s*:/.test(trimmed) && /"edges"\s*:/.test(trimmed)) ||
                    (/"participants"\s*:/.test(trimmed) && /"messages"\s*:/.test(trimmed)));
            const block = (lang: string, value: string) => <CodeBlock language={lang} value={value} components={components} owner={currentOwner} repo={currentRepo} />;

            if (language === "mermaid") return <Mermaid chart={raw} isStreaming={isStreaming} />;

            if (language === "svg") {
                return (
                    <div className="my-4 rounded-nv-md border border-nv-warning-edge bg-nv-warning-wash p-3">
                        <p className="mb-2 text-nv-small text-nv-warning">Direct SVG rendering is deprecated. Showing legacy SVG source.</p>
                        {block("svg", raw)}
                    </div>
                );
            }

            if (language === "mermaid-json" || language === "json" || looksLikeDiagramJson) {
                try {
                    const compiled = compileMermaidFromJSON(JSON.parse(raw));
                    if (compiled.valid && compiled.mermaid) return <Mermaid chart={compiled.mermaid} isStreaming={isStreaming} />;
                } catch {
                    // Not diagram JSON; fall through to the code view.
                }
                if (isStreaming) return <Spinner label="Generating diagram" className="my-4 rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-900 p-4" />;
                return block("json", raw);
            }

            if (Boolean(match) || raw.endsWith("\n") || inline === false) return block(match?.[1] ?? "markdown", raw);

            return (
                <InlineCode text={raw} className={className} fileTree={fileTree} hasLanguage={false} {...props}>
                    {children}
                </InlineCode>
            );
        },
        pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
    };

    return (
        <div className="w-full text-nv-body text-nv-ivory-100 [&>*:first-child]:!mt-0">
            <EnhancedMarkdown content={repaired} components={components} currentOwner={currentOwner} currentRepo={currentRepo} isStreaming={isStreaming} fileTree={fileTree} />
        </div>
    );
}

export const MessageContent = MessageContentBase;
