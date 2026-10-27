"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import type { ModelPreference } from "@/lib/ai-client";
import type { ChatMessageBase, MessageFailure, ThinkingChatMessage } from "@/lib/chat-types";
import { copyChatMessageContent, exportChatMessages } from "@/lib/chat-message-actions";
import { MAX_TOKENS, countMessageTokens } from "@/lib/tokens";
import { STREAM_ERROR_MESSAGES } from "@/lib/streaming-types";
import {
    analysisReducer,
    classifyFailure,
    eventForClassified,
    initialAnalysisState,
    isBusy,
    type AnalysisState,
    type ClassifiedFailure,
} from "./analysis-machine";
import {
    StreamHttpError,
    classifyThrown,
    errorFromResponse,
    formatToolStatusLabel,
    isAbort,
    normalizeStreamingLabel,
    readChunks,
} from "./stream-client";

type ChatRunStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface RunSnapshot {
    runId?: string;
    status: ChatRunStatus;
    partialText?: string;
    finalText?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    updatedAt?: string;
}

export interface AnalysisChatConfig<M extends ThinkingChatMessage> {
    scope: "repo" | "profile";
    /** Changing this aborts the open request; callers also remount with a key. */
    contextKey: string;
    contextLabel: string;
    welcome: string;
    endpoint: string;
    /** Phase label before the server sends its first status chunk. */
    firstStatus: string;
    runBody: Record<string, unknown>;
    historyLimit: number;
    taggedHeader: string;
    useCloudStorage: boolean;
    buildBody: (args: {
        query: string;
        history: { role: string; content: string }[];
        modelPreference: ModelPreference;
        crossRepoEnabled: boolean;
        runId: string | null;
    }) => unknown;
    /** Rewrites a stock prompt into the longer server prompt; identity by default. */
    transformQuery?: (text: string) => string;
    storage: {
        load: (cloud: boolean) => Promise<ChatMessageBase[] | null>;
        save: (messages: M[], cloud: boolean) => Promise<void>;
        clear: (cloud: boolean) => Promise<void>;
    };
    /** Called after every request settles, whatever the outcome (quota refresh). */
    onSettled?: () => void;
}

export interface SubmitOptions {
    text: string;
    taggedFiles?: string[];
    referenceText?: string;
    modelPreference: ModelPreference;
    crossRepoEnabled?: boolean;
}

export type ActionStatus = { tone: "success" | "error"; text: string } | null;

function newId(): string {
    return `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

function sameMessages(a: ChatMessageBase[], b: ChatMessageBase[]): boolean {
    return a.length === b.length && a.every((m, i) => m.id === b[i]?.id && m.role === b[i]?.role && m.content === b[i]?.content);
}

/**
 * A saved model message that was still streaming when the page closed. The run record holds the
 * fuller text, so restoring replaces this partial instead of showing it twice.
 */
export function dropInterruptedTail<T extends ChatMessageBase>(messages: T[]): T[] {
    const last = messages[messages.length - 1];
    if (last && last.role === "model" && last.streamStatus && last.streamStatus !== "Completed" && !last.failure) {
        return messages.slice(0, -1);
    }
    return messages;
}

export function withTaggedFiles(header: string, files: string[] | undefined, text: string): string {
    if (!files || files.length === 0) return text;
    return `${header}\n${files.map((f) => `- ${f}`).join("\n")}\n\n${text}`;
}

function failureFromRun(run: RunSnapshot): MessageFailure {
    const code = run.errorCode ?? undefined;
    const classified = classifyFailure({ code, message: code ? undefined : run.errorMessage ?? undefined });
    return {
        ...classified.failure,
        code: code ?? (run.status === "CANCELLED" ? "STREAM_TRUNCATED" : "INTERNAL"),
        message: run.status === "CANCELLED" ? STREAM_ERROR_MESSAGES.STREAM_TRUNCATED : classified.failure.message,
        retryable: true,
    };
}

export function useAnalysisChat<M extends ThinkingChatMessage>(config: AnalysisChatConfig<M>) {
    const cfg = useRef(config);

    const welcomeMessage = (): M => ({ id: "welcome", role: "model", content: config.welcome }) as M;
    const [messages, setMessages] = useState<M[]>(() => [welcomeMessage()]);
    const messagesRef = useRef(messages);

    const [machine, dispatch] = useReducer(analysisReducer, initialAnalysisState);
    const machineRef = useRef<AnalysisState>(machine);

    // Latest-value refs for callbacks; updated after every commit, before any event handler runs.
    useLayoutEffect(() => {
        cfg.current = config;
        messagesRef.current = messages;
        machineRef.current = machine;
    });

    const [initialized, setInitialized] = useState(false);
    const [resuming, setResuming] = useState(false);
    const [actionStatus, setActionStatus] = useState<ActionStatus>(null);

    const requestSeq = useRef(0);
    const abortRef = useRef<AbortController | null>(null);
    const generation = useRef(0);
    const pollTimer = useRef<number | null>(null);
    const feedbackTimer = useRef<number | null>(null);
    const submitting = useRef(false);
    const runKey = `novaris:chatRun:${config.scope}:${config.contextKey}`;

    const patch = (id: string, change: (m: M) => M) => setMessages((prev) => prev.map((m) => (m.id === id ? change(m) : m)));

    const flashStatus = (status: ActionStatus) => {
        setActionStatus(status);
        if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
        feedbackTimer.current = window.setTimeout(() => setActionStatus(null), 4000);
    };

    // Abort the open request and stop polling when the view goes away. The server keeps generating
    // by policy; the run id stays in sessionStorage so a reload resumes the saved answer.
    useEffect(() => {
        return () => {
            generation.current += 1;
            abortRef.current?.abort();
            if (pollTimer.current) window.clearTimeout(pollTimer.current);
            if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
        };
    }, []);

    const applyRunText = (resumeId: string, run: RunSnapshot) => {
        const text = (run.finalText ?? run.partialText ?? "").toString();
        if (!text && run.status !== "FAILED" && run.status !== "CANCELLED") return;
        const failure = run.status === "FAILED" || run.status === "CANCELLED" ? failureFromRun(run) : undefined;
        setMessages((prev) => {
            const next = { id: resumeId, role: "model", content: text, failure, streamStatus: run.status === "RUNNING" ? "Resuming" : run.status === "COMPLETED" ? "Completed" : "Stopped" } as M;
            return prev.some((m) => m.id === resumeId) ? prev.map((m) => (m.id === resumeId ? { ...m, ...next } : m)) : [...prev, next];
        });
    };

    const fetchRun = async (runId: string): Promise<RunSnapshot | "unavailable" | null> => {
        try {
            const res = await fetch(`/api/chat/run?runId=${encodeURIComponent(runId)}`);
            if (res.ok) return (await res.json()) as RunSnapshot;
            return res.status === 503 ? "unavailable" : null;
        } catch {
            return "unavailable";
        }
    };

    /** Poll a server-side run until it ends. Stops when this view or request is superseded. */
    const watchRun = (runId: string, msgId: string, requestId: number, gen: number, firstDelay = 600) => {
        const STALL_MS = 60_000;
        let lastSeen = "";
        let lastMovedAt = Date.now();
        const stale = () => gen !== generation.current;
        const poll = async () => {
            const next = await fetchRun(runId);
            if (stale()) return;
            if (next === "unavailable" || next === null) {
                dispatch({ type: "STATUS", requestId, label: next === null ? "Saved answer not found" : "Cannot check the saved answer right now. Retrying" });
                if (next === null) {
                    window.sessionStorage.removeItem(runKey);
                    setResuming(false);
                    dispatch({ type: "FAIL", requestId, failure: { code: "RUN_NOT_FOUND", message: "The saved answer is no longer available. Ask the question again.", retryable: true } });
                    return;
                }
                pollTimer.current = window.setTimeout(poll, 2000);
                return;
            }
            applyRunText(msgId, next);
            if (next.status === "RUNNING") {
                const marker = `${next.updatedAt ?? ""}|${(next.partialText ?? "").length}`;
                if (marker !== lastSeen) {
                    lastSeen = marker;
                    lastMovedAt = Date.now();
                } else if (Date.now() - lastMovedAt > STALL_MS) {
                    window.sessionStorage.removeItem(runKey);
                    setResuming(false);
                    const failure: MessageFailure = { code: "STREAM_TRUNCATED", message: "The server stopped updating this answer, so it may have stalled. Ask the question again.", retryable: true };
                    patch(msgId, (m) => ({ ...m, streamStatus: "Stopped", failure }));
                    dispatch({ type: "FAIL", requestId, failure });
                    return;
                }
                pollTimer.current = window.setTimeout(poll, 1000);
                return;
            }
            window.sessionStorage.removeItem(runKey);
            setResuming(false);
            if (next.status === "COMPLETED") dispatch({ type: "COMPLETE", requestId });
            else dispatch({ type: "FAIL", requestId, failure: failureFromRun(next) });
        };
        setResuming(true);
        pollTimer.current = window.setTimeout(poll, firstDelay);
    };

    // Restore the saved conversation, then reconcile any run that was open when the page closed.
    useEffect(() => {
        const gen = ++generation.current;
        let cancelled = false;
        const stale = () => cancelled || gen !== generation.current;

        const restore = async () => {
            const saved = await cfg.current.storage.load(cfg.current.useCloudStorage).catch(() => null);
            if (stale()) return;
            const storedRunId = window.sessionStorage.getItem(runKey);
            if (saved && saved.length > 1) {
                const base = (storedRunId ? dropInterruptedTail(saved) : saved) as M[];
                setMessages((prev) => (sameMessages(prev, base) ? prev : base));
            }
            setInitialized(true);
            if (!storedRunId) return;

            const run = await fetchRun(storedRunId);
            if (stale()) return;
            if (run === "unavailable") {
                flashStatus({ tone: "error", text: "A saved answer exists but its status cannot be checked right now. Reload to try again." });
                return;
            }
            if (!run) {
                window.sessionStorage.removeItem(runKey);
                return;
            }
            const resumeId = `run-${storedRunId}`;
            applyRunText(resumeId, run);
            if (run.status !== "RUNNING") {
                window.sessionStorage.removeItem(runKey);
                return;
            }
            const requestId = ++requestSeq.current;
            dispatch({ type: "SUBMIT", requestId });
            dispatch({ type: "VALID", requestId, label: "Reconnecting to a saved answer" });
            dispatch({ type: "STREAM_OPEN", requestId });
            watchRun(storedRunId, resumeId, requestId, gen);
        };

        void restore();
        return () => {
            cancelled = true;
            if (pollTimer.current) window.clearTimeout(pollTimer.current);
        };
        // contextKey and storage mode decide what to restore; everything else is read through refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.contextKey, config.useCloudStorage]);

    useEffect(() => {
        if (initialized && messages.length > 1 && !isBusy(machine)) {
            void cfg.current.storage.save(messages, cfg.current.useCloudStorage);
        }
    }, [messages, initialized, machine, config.useCloudStorage]);

    const totalTokens = countMessageTokens(messages.map((m) => ({ role: m.role, parts: m.content })));
    const overTokenLimit = totalTokens >= MAX_TOKENS;

    /** Shared lifecycle for anything that takes time: model streams and security scans. */
    const track = async (label: string, task: (ctx: { requestId: number; signal: AbortSignal; open: () => void }) => Promise<void>) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const requestId = ++requestSeq.current;
        dispatch({ type: "SUBMIT", requestId });
        dispatch({ type: "VALID", requestId, label });
        let classified: ClassifiedFailure | null = null;
        try {
            await task({ requestId, signal: controller.signal, open: () => dispatch({ type: "STREAM_OPEN", requestId }) });
            if (!controller.signal.aborted) dispatch({ type: "COMPLETE", requestId });
        } catch (error) {
            if (isAbort(error) || controller.signal.aborted) return null;
            classified = classifyThrown(error);
            dispatch(eventForClassified(requestId, classified));
        } finally {
            if (abortRef.current === controller) abortRef.current = null;
            cfg.current.onSettled?.();
        }
        return classified;
    };

    const streamTurn = async (userMsg: M, base: M[], opts: Pick<SubmitOptions, "modelPreference" | "crossRepoEnabled">) => {
        const c = cfg.current;
        const modelMsgId = newId();
        const thinking = opts.modelPreference === "thinking";
        setMessages([
            ...base,
            userMsg,
            { id: modelMsgId, role: "model", content: "", reasoningSteps: [], relevantFiles: [], modelUsed: opts.modelPreference, streamStatus: c.firstStatus } as unknown as M,
        ]);

        const history = base.slice(-c.historyLimit).map((m) => ({
            role: m.role,
            content: m.role === "user" ? withTaggedFiles(c.taggedHeader, m.taggedFiles, m.content) : m.content,
        }));
        const query = withTaggedFiles(c.taggedHeader, userMsg.taggedFiles, c.transformQuery ? c.transformQuery(userMsg.content.trim()) : userMsg.content);

        let content = "";
        let completed = false;
        let runId: string | null = null;
        const reasoning: string[] = [];

        const classified = await track(c.firstStatus, async ({ requestId, signal, open }) => {
            const clientRequestId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            const runRes = await fetch("/api/chat/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...c.runBody, clientRequestId }),
                signal,
            }).catch((e) => {
                if (isAbort(e)) throw e;
                return null;
            });
            if (runRes?.ok) {
                const run = (await runRes.json()) as { runId?: string };
                runId = typeof run.runId === "string" ? run.runId : null;
                if (runId) window.sessionStorage.setItem(runKey, runId);
            }

            const response = await fetch(c.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(c.buildBody({ query, history, modelPreference: opts.modelPreference, crossRepoEnabled: Boolean(opts.crossRepoEnabled), runId })),
                signal,
            });
            if (!response.ok || !response.body) throw await errorFromResponse(response);
            open();

            for await (const chunk of readChunks(response.body)) {
                if (chunk.type === "status") {
                    const label = normalizeStreamingLabel(chunk.message);
                    if (chunk.code === "TOOLS_UNAVAILABLE") {
                        dispatch({ type: "TOOLS_DISABLED", requestId });
                        patch(modelMsgId, (m) => ({ ...m, toolsDisabled: true }));
                    }
                    if (thinking) reasoning.push(label);
                    dispatch({ type: "STATUS", requestId, label });
                    patch(modelMsgId, (m) => ({ ...m, streamStatus: label, reasoningSteps: thinking ? [...reasoning] : m.reasoningSteps }));
                } else if (chunk.type === "tool") {
                    const label = formatToolStatusLabel(chunk.name, chunk.detail);
                    if (thinking) reasoning.push(`Tool: ${label}`);
                    dispatch({ type: "TOOL", requestId, name: chunk.name, label });
                    patch(modelMsgId, (m) => ({ ...m, streamStatus: label, reasoningSteps: thinking ? [...reasoning] : m.reasoningSteps }));
                } else if (chunk.type === "thought") {
                    if (!thinking) continue;
                    reasoning.push(chunk.text);
                    patch(modelMsgId, (m) => ({ ...m, reasoningSteps: [...reasoning] }));
                } else if (chunk.type === "content") {
                    content = !content && chunk.text ? chunk.text.trimStart() : content + chunk.text;
                    patch(modelMsgId, (m) => ({ ...m, content }));
                } else if (chunk.type === "files") {
                    patch(modelMsgId, (m) => ({ ...m, relevantFiles: chunk.files }));
                } else if (chunk.type === "complete") {
                    completed = true;
                    patch(modelMsgId, (m) => ({
                        ...m,
                        relevantFiles: chunk.relevantFiles ?? m.relevantFiles,
                        commitFreshnessLabel: chunk.metadata?.commitFreshnessLabel,
                        toolsUsed: chunk.metadata?.toolsUsed,
                        processingSummary: chunk.metadata?.processingSummary,
                        sourceScope: chunk.metadata?.sourceScope,
                    }));
                } else if (chunk.type === "error") {
                    throw new StreamHttpError(chunk.message, { code: chunk.code });
                }
            }
            if (!completed) {
                throw new StreamHttpError(STREAM_ERROR_MESSAGES.STREAM_TRUNCATED, { code: runId ? "STREAM_DROPPED" : "STREAM_TRUNCATED" });
            }
            patch(modelMsgId, (m) => ({ ...m, content, streamStatus: "Completed" }));
            window.sessionStorage.removeItem(runKey);
        });

        if (classified && classified.failure.code === "STREAM_DROPPED" && runId) {
            // The connection closed without a terminal chunk: the answer is unfinished, not complete.
            // The run record is the source of truth, so keep watching it.
            patch(modelMsgId, (m) => ({ ...m, content, streamStatus: "Resuming" }));
            const requestId = ++requestSeq.current;
            dispatch({ type: "SUBMIT", requestId });
            dispatch({ type: "VALID", requestId, label: "Connection dropped. Checking the saved answer" });
            dispatch({ type: "STREAM_OPEN", requestId });
            watchRun(runId, modelMsgId, requestId, generation.current);
            return null;
        }
        if (classified) {
            // The partial answer stays; the failure notice explains why it stopped.
            patch(modelMsgId, (m) => ({ ...m, content, streamStatus: "Stopped", failure: classified.failure }));
            // Terminal server-side outcomes close the saved run; an abort does not reach this branch.
            window.sessionStorage.removeItem(runKey);
        }
        return classified;
    };

    const submit = async (opts: SubmitOptions): Promise<ClassifiedFailure | "invalid" | null> => {
        if (submitting.current || isBusy(machineRef.current)) return "invalid";
        const text = opts.text.trim();
        if (!text && !opts.referenceText) return "invalid";
        if (overTokenLimit) {
            flashStatus({ tone: "error", text: "This conversation is at its length limit. Clear the chat to start a new one." });
            return "invalid";
        }
        submitting.current = true;
        try {
            let body = text || "Please continue.";
            if (opts.referenceText) body = `Reference:\n> ${opts.referenceText.replace(/\n/g, "\n> ")}\n\n${body}`;
            const userMsg = {
                id: newId(),
                role: "user",
                content: body,
                taggedFiles: opts.taggedFiles && opts.taggedFiles.length > 0 ? [...opts.taggedFiles] : undefined,
            } as M;
            return await streamTurn(userMsg, messagesRef.current, opts);
        } finally {
            submitting.current = false;
        }
    };

    /** Re-run the question behind a failed answer. The failed partial is replaced. */
    const retry = async (failedId: string, opts: Pick<SubmitOptions, "modelPreference" | "crossRepoEnabled">) => {
        if (submitting.current || isBusy(machineRef.current)) return;
        const all = messagesRef.current;
        const failedIdx = all.findIndex((m) => m.id === failedId);
        if (failedIdx < 1) return;
        let userIdx = failedIdx - 1;
        while (userIdx >= 0 && all[userIdx]?.role !== "user") userIdx -= 1;
        const userMsg = all[userIdx];
        if (!userMsg) return;
        submitting.current = true;
        try {
            await streamTurn(userMsg, all.slice(0, userIdx), opts);
        } finally {
            submitting.current = false;
        }
    };

    const clear = async () => {
        generation.current += 1;
        abortRef.current?.abort();
        window.sessionStorage.removeItem(runKey);
        await cfg.current.storage.clear(cfg.current.useCloudStorage);
        dispatch({ type: "RESET" });
        setResuming(false);
        setInitialized(true);
        setMessages([welcomeMessage()]);
        flashStatus({ tone: "success", text: "Chat history cleared." });
    };

    const copyMessage = async (message: M): Promise<boolean> => {
        try {
            await copyChatMessageContent(message.content);
            flashStatus({ tone: "success", text: "Response copied to the clipboard." });
            return true;
        } catch {
            flashStatus({ tone: "error", text: "Copy failed. The browser blocked clipboard access." });
            return false;
        }
    };

    const exportChat = async () => {
        try {
            await exportChatMessages({ title: `${cfg.current.contextLabel} Chat Export`, contextLabel: cfg.current.contextLabel, messages: messagesRef.current });
            flashStatus({ tone: "success", text: "Chat exported as a Markdown file." });
        } catch {
            flashStatus({ tone: "error", text: "Export failed. Try again, or copy the answers one by one." });
        }
    };

    return {
        messages,
        setMessages,
        machine,
        busy: isBusy(machine),
        resuming,
        totalTokens,
        overTokenLimit,
        actionStatus,
        flashStatus,
        submit,
        retry,
        clear,
        copyMessage,
        exportChat,
        track,
        patch,
        dismiss: () => dispatch({ type: "RESET" }),
    };
}
