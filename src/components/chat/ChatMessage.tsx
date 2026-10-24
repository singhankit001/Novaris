"use client";

import { Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/nv/button";
import { Citation } from "@/components/nv/evidence";
import { Notice } from "@/components/nv/notice";
import { ReasoningBlock } from "@/components/ReasoningBlock";
import { MessageContent } from "./MessageContent";
import { StreamStatus } from "./StreamStatus";
import { failureNotice } from "./stream-client";
import type { RepoChatMessage } from "@/lib/chat-types";

interface ChatMessageProps {
    message: RepoChatMessage;
    allMessages: { id: string }[];
    /** This is the message being written right now. */
    streaming: boolean;
    currentOwner?: string;
    currentRepo?: string;
    fileTree?: { path: string }[];
    onCopy: (message: RepoChatMessage) => void;
    onRetry?: (messageId: string) => void;
    /** Opens a cited file when the message belongs to a repository workspace. */
    onOpenFile?: (path: string) => void;
    userLabel?: string;
    children?: React.ReactNode;
}

const MAX_CITATIONS = 8;

/** One turn. Answers show their evidence (files read, tools called, scope) and any failure under the text. */
export function ChatMessage({ message, allMessages, streaming, currentOwner, currentRepo, fileTree, onCopy, onRetry, onOpenFile, userLabel = "You", children }: ChatMessageProps) {
    const isUser = message.role === "user";
    const files = message.relevantFiles ?? [];
    const meta = [message.sourceScope && `Scope: ${message.sourceScope}`, message.commitFreshnessLabel, message.processingSummary?.join(" · ")].filter(Boolean) as string[];
    const hasText = Boolean(message.content);
    const failed = Boolean(message.failure);

    if (isUser) {
        return (
            <article aria-label="Your question" data-message-role="user" className="ml-auto w-full max-w-[min(100%,44rem)] rounded-nv-md border border-nv-graphite-600 bg-nv-graphite-800 px-4 py-3">
                <p className="nv-eyebrow mb-1">{userLabel}</p>
                {message.taggedFiles && message.taggedFiles.length > 0 && (
                    <ul className="m-0 mb-2 flex list-none flex-wrap gap-1.5 p-0">
                        {message.taggedFiles.map((f) => (
                            <li key={f}><Citation kind="file" target={f} /></li>
                        ))}
                    </ul>
                )}
                <p className="m-0 whitespace-pre-wrap break-words text-nv-body text-nv-ivory-50 [overflow-wrap:anywhere]">{message.content}</p>
            </article>
        );
    }

    return (
        <article aria-label="Answer" data-message-role="model" aria-busy={streaming || undefined} className="w-full max-w-[min(100%,48rem)]">
            <p className="nv-eyebrow mb-2">Novaris</p>
            {message.modelUsed === "thinking" && ((message.reasoningSteps?.length ?? 0) > 0 || streaming) && <ReasoningBlock steps={message.reasoningSteps ?? []} isStreaming={streaming} />}
            {message.modelUsed !== "thinking" && <StreamStatus message={message.streamStatus} isStreaming={streaming} />}
            {hasText && (
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                    <MessageContent content={message.content} messageId={message.id} messages={allMessages} currentOwner={currentOwner} currentRepo={currentRepo} isStreaming={streaming} fileTree={fileTree} />
                </div>
            )}
            {children}

            {failed && message.failure && (
                <Notice
                    className="mt-3"
                    tone="warning"
                    title={hasText ? "This answer stopped early" : "No answer was produced"}
                    action={message.failure.retryable && onRetry ? <Button leading={<RotateCcw aria-hidden className="size-4" />} onClick={() => onRetry(message.id)}>Try again</Button> : undefined}
                >
                    {hasText && <span>The text above is incomplete. </span>}
                    {failureNotice(message.failure)}
                </Notice>
            )}
            {message.toolsDisabled && (
                <Notice className="mt-3" tone="info" title="Live lookups were off for this answer">
                    The tool budget could not be checked, so the model used only the data already loaded. Newer commits or files may be missing.
                </Notice>
            )}

            {!streaming && (files.length > 0 || (message.toolsUsed?.length ?? 0) > 0 || meta.length > 0) && (
                <section aria-label="What this answer is based on" className="mt-3 border-t border-nv-graphite-700 pt-3">
                    <p className="nv-eyebrow mb-2">Based on</p>
                    {files.length > 0 && (
                        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                            {files.slice(0, MAX_CITATIONS).map((f) => (
                                <li key={f} className="max-w-full">
                                    {onOpenFile ? (
                                        <button type="button" onClick={() => onOpenFile(f)} className="max-w-full rounded-nv-xs text-left" aria-label={`Open ${f}`}>
                                            <Citation kind="file" target={f} />
                                        </button>
                                    ) : (
                                        <Citation kind="file" target={f} />
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {files.length > MAX_CITATIONS && (
                        <details className="mt-2 text-nv-small text-nv-ivory-200">
                            <summary className="min-h-8 cursor-pointer">{files.length - MAX_CITATIONS} more files read</summary>
                            <ul className="mt-1 list-none space-y-1 p-0 font-mono text-nv-micro">{files.slice(MAX_CITATIONS).map((f) => <li key={f} className="break-all">{f}</li>)}</ul>
                        </details>
                    )}
                    {(message.toolsUsed?.length ?? 0) > 0 && <p className="mt-2 text-nv-small text-nv-ivory-300">Tools called: <span className="font-mono text-nv-ivory-200">{message.toolsUsed!.join(", ")}</span></p>}
                    {meta.length > 0 && <p className="mt-1 text-nv-small text-nv-ivory-300">{meta.join(" · ")}</p>}
                </section>
            )}

            {hasText && !streaming && (
                <div className="mt-2 flex items-center gap-1">
                    <Button variant="ghost" onClick={() => onCopy(message)} leading={<Copy aria-hidden className="size-4" />} aria-label="Copy this answer as Markdown">Copy</Button>
                </div>
            )}
        </article>
    );
}
