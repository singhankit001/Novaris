"use client";

import { Check, Copy, FileCode2, RotateCcw, Sparkles } from "lucide-react";
import { BotIcon } from "@/components/icons/BotIcon";
import { Button } from "@/components/nv/button";
import { Notice } from "@/components/nv/notice";
import { ReasoningBlock } from "@/components/ReasoningBlock";
import { cn } from "@/lib/utils";
import { MessageContent } from "./MessageContent";
import { StreamStatus } from "./StreamStatus";
import { failureNotice } from "./stream-client";
import s from "./chat.module.css";
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
    copied?: boolean;
    onRetry?: (messageId: string) => void;
    /** Opens a cited file when the message belongs to a repository workspace. */
    onOpenFile?: (path: string) => void;
    userLabel?: string;
    children?: React.ReactNode;
}

const MAX_CITATIONS = 8;

const chipClass =
    "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md border border-nv-copper-700 bg-nv-copper-wash px-2 py-1 font-nv-mono text-[0.71875rem] text-nv-copper-300 transition-[background-color,border-color,box-shadow] duration-150";

/** One turn. Answers read as a document; evidence, failures and actions sit under the text. */
export function ChatMessage({ message, allMessages, streaming, currentOwner, currentRepo, fileTree, onCopy, copied = false, onRetry, onOpenFile, userLabel = "You", children }: ChatMessageProps) {
    const isUser = message.role === "user";
    const files = message.relevantFiles ?? [];
    const meta = [message.sourceScope && `Scope: ${message.sourceScope}`, message.commitFreshnessLabel, message.processingSummary?.join(" · ")].filter(Boolean) as string[];
    const hasText = Boolean(message.content);
    const failed = Boolean(message.failure);
    const thinking = message.modelUsed === "thinking";

    if (isUser) {
        return (
            <article aria-label="Your question" data-message-role="user" className="ml-auto w-fit min-w-0 max-w-[min(100%,34rem)] rounded-[1.25rem] rounded-br-md border border-nv-graphite-700 bg-gradient-to-b from-white to-nv-graphite-850 px-4 py-3 shadow-nv-card">
                {message.taggedFiles && message.taggedFiles.length > 0 && (
                    <ul className="m-0 mb-2.5 flex list-none flex-wrap gap-1.5 p-0">
                        {message.taggedFiles.map((f) => (
                            <li key={f} className="max-w-full">
                                <button type="button" onClick={() => onOpenFile?.(f)} disabled={!onOpenFile} className={cn(chipClass, "bg-white", onOpenFile && "hover:border-nv-copper-600 hover:shadow-nv-xs")} aria-label={`Open ${f}`}>
                                    <FileCode2 aria-hidden className="size-3.5 shrink-0" />
                                    <span className="truncate">{f}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="m-0 whitespace-pre-wrap break-words text-[0.9375rem] leading-[1.6] text-nv-ivory-50 [overflow-wrap:anywhere]">{message.content}</p>
                <span className="sr-only">{userLabel}</span>
            </article>
        );
    }

    return (
        <article aria-label="Answer" data-message-role="model" aria-busy={streaming || undefined} className="group/msg grid w-full min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4">
            <span aria-hidden className={`${s.mark} mt-0.5 grid size-7 place-items-center rounded-[0.6rem]`}>
                <BotIcon className="size-4" />
            </span>
            <div className="min-w-0">
                <header className="mb-3 flex min-h-7 flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-[0.8125rem] font-semibold tracking-[-0.01em] text-nv-ivory-50">Novaris</span>
                    {message.modelUsed && (
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-px text-[0.6875rem] font-medium", thinking ? "border-nv-violet-400/25 bg-nv-violet-wash text-nv-violet-600" : "border-nv-graphite-700 bg-nv-graphite-850 text-nv-ivory-300")}>
                            {thinking && <Sparkles aria-hidden className="size-3" />}
                            {thinking ? "Thinking" : "Lite"}
                        </span>
                    )}
                </header>

                {thinking && ((message.reasoningSteps?.length ?? 0) > 0 || streaming) && <ReasoningBlock steps={message.reasoningSteps ?? []} isStreaming={streaming} />}
                {!thinking && <StreamStatus message={message.streamStatus} isStreaming={streaming} />}

                {hasText && (
                    <div className={cn("min-w-0 break-words text-[0.9375rem] leading-[1.75] text-nv-ivory-100 [overflow-wrap:anywhere]", streaming && s.streaming)}>
                        <MessageContent content={message.content} messageId={message.id} messages={allMessages} currentOwner={currentOwner} currentRepo={currentRepo} isStreaming={streaming} fileTree={fileTree} />
                    </div>
                )}
                {children}

                {failed && message.failure && (
                    <Notice
                        className="mt-4"
                        tone="warning"
                        title={hasText ? "This answer stopped early" : "No answer was produced"}
                        action={message.failure.retryable && onRetry ? <Button leading={<RotateCcw aria-hidden className="size-4" />} onClick={() => onRetry(message.id)}>Try again</Button> : undefined}
                    >
                        {hasText && <span>The text above is incomplete. </span>}
                        {failureNotice(message.failure)}
                    </Notice>
                )}
                {message.toolsDisabled && (
                    <Notice className="mt-4" tone="info" title="Live lookups were off for this answer">
                        The tool budget could not be checked, so the model used only the data already loaded. Newer commits or files may be missing.
                    </Notice>
                )}

                {!streaming && (files.length > 0 || (message.toolsUsed?.length ?? 0) > 0 || meta.length > 0) && (
                    <section aria-label="What this answer is based on" className="mt-6 rounded-nv-lg border border-nv-graphite-700 bg-white/70 p-4">
                        <p className="nv-eyebrow mb-2.5 flex items-center gap-2">
                            Based on
                            {files.length > 0 && <span className="nv-num rounded-full bg-nv-graphite-850 px-1.5 text-nv-ivory-200">{files.length}</span>}
                        </p>
                        {files.length > 0 && (
                            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                                {files.slice(0, MAX_CITATIONS).map((f) => (
                                    <li key={f} className="max-w-full">
                                        <button type="button" onClick={() => onOpenFile?.(f)} disabled={!onOpenFile} className={cn(chipClass, onOpenFile && "hover:border-nv-copper-600 hover:bg-white hover:shadow-nv-xs")} aria-label={`Open ${f}`}>
                                            <FileCode2 aria-hidden className="size-3.5 shrink-0" />
                                            <span className="truncate">{f}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {files.length > MAX_CITATIONS && (
                            <details className="mt-2 text-nv-small text-nv-ivory-200">
                                <summary className="min-h-8 cursor-pointer select-none">{files.length - MAX_CITATIONS} more files read</summary>
                                <ul className="mt-1 list-none space-y-1 p-0 font-nv-mono text-nv-micro">{files.slice(MAX_CITATIONS).map((f) => <li key={f} className="break-all">{f}</li>)}</ul>
                            </details>
                        )}
                        {(message.toolsUsed?.length ?? 0) > 0 && <p className="mt-2.5 text-nv-small text-nv-ivory-300">Tools called: <span className="font-nv-mono text-nv-ivory-200">{message.toolsUsed!.join(", ")}</span></p>}
                        {meta.length > 0 && <p className="mt-1.5 text-nv-small text-nv-ivory-300">{meta.join(" · ")}</p>}
                    </section>
                )}

                {hasText && !streaming && (
                    <div className="-ml-2 mt-3 flex items-center gap-0.5 opacity-100 transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:focus-within:opacity-100 [@media(hover:hover)]:group-hover/msg:opacity-100">
                        <Button variant="ghost" className={cn("min-h-11 px-2.5 text-nv-small", copied && "text-nv-success")} onClick={() => onCopy(message)} leading={copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />} aria-label="Copy this answer as Markdown">
                            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
                        </Button>
                    </div>
                )}
            </div>
        </article>
    );
}
