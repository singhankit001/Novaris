import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ArrowDown, ArrowLeft, BookMarked, Code2, Github, Languages, MapPin, Sparkles, Star, Users, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GitHubProfile } from "@/lib/github";
import { countMessageTokens, formatTokenCount, getTokenWarningLevel, isRateLimitError, getRateLimitErrorMessage, MAX_TOKENS } from "@/lib/tokens";
import { COPY_FEEDBACK_MS } from "@/lib/chat-constants";
import { copyChatMessageContent, exportChatMessages } from "@/lib/chat-message-actions";
import { parseStreamChunk } from "@/lib/streaming-parser";
import { saveProfileConversation, loadProfileConversation, clearProfileConversation } from "@/lib/storage";
import type { ModelPreference } from "@/lib/ai-client";
import type { MessageFailure, ProfileChatMessage } from "@/lib/chat-types";

import { ConfirmDialog } from "./ConfirmDialog";
import { LoginModal } from "./LoginModal";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/nv/button";
import { Notice } from "@/components/nv/notice";
import { ChatMessage } from "./chat/ChatMessage";
import { ChatHero, type HeroSuggestion } from "./chat/ChatHero";
import { WorkspaceToolbar } from "./chat/WorkspaceToolbar";
import { useStickToBottom } from "./chat/use-stick-to-bottom";
import s from "./chat/chat.module.css";
import { useMessageSelection } from "./chat/useMessageSelection";
import { ToolQuotaModal } from "./chat/ToolQuotaModal";

interface ProfileChatInterfaceProps {
    profile: GitHubProfile;
    profileReadme: string | null;
    repoReadmes: { repo: string; content: string; updated_at: string; description: string | null; stars: number; forks: number; language: string | null }[];
    recentCommits: { repo: string; message: string; date: string | null; sha: string }[];
    recentCommitFreshnessLabel: string;
}

const PROFILE_SUGGESTIONS = [
    "What projects is he/she known for?",
    "What are his/her main skills and expertise?",
    "Summarize his/her most popular repositories",
    "What programming languages does he/she use?",
];

interface ComposerNoticeState {
    tone: "info" | "warning";
    title: string;
    body: string;
    action?: "sign-in";
}

type HttpError = Error & { status?: number; code?: string };
type ChatRunStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
type ToolQuotaScope = "repo" | "profile";
type ToolQuotaAudience = "anonymous" | "authenticated";

interface ToolQuotaState {
    scope: ToolQuotaScope;
    audience: ToolQuotaAudience;
    used: number;
    limit: number;
    remaining: number;
    resetAt: string;
    windowSecondsRemaining: number;
    exhausted: boolean;
}

const SUPPORT_EMAIL = "singhankit91624@gmail.com";

function formatDuration(seconds: number): string {
    const normalized = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const secs = normalized % 60;
    return [hours, minutes, secs].map((value) => value.toString().padStart(2, "0")).join(":");
}

function areProfileMessagesEquivalent(left: ProfileChatMessage[], right: ProfileChatMessage[]): boolean {
    if (left.length !== right.length) return false;
    return left.every((message, index) => {
        const next = right[index];
        if (!next) return false;
        return (
            message.id === next.id &&
            message.role === next.role &&
            message.content === next.content
        );
    });
}

function parseResponseError(rawResponseText: string, status: number): { message: string; code?: string } {
    if (!rawResponseText.trim()) {
        return { message: `Failed to start analysis stream (HTTP ${status}).` };
    }

    try {
        const parsed = JSON.parse(rawResponseText) as { error?: unknown; code?: unknown };
        if (typeof parsed.error === "string" && parsed.error.trim()) {
            return {
                message: parsed.error,
                code: typeof parsed.code === "string" ? parsed.code : undefined,
            };
        }
    } catch {
        // Ignore parse failure and fall back to raw response text.
    }

    return { message: rawResponseText.trim() };
}

function getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object") return undefined;
    const maybeStatus = (error as { status?: unknown }).status;
    return typeof maybeStatus === "number" ? maybeStatus : undefined;
}

function getUserFacingAnalysisError(error: unknown, code?: string): string {
    if (code === "AI_FUNCTION_TURN_ORDER" || code === "AI_MISSING_THOUGHT_SIGNATURE") {
        return "AI tool handoff failed during streaming. Please retry.";
    }

    const raw = error instanceof Error ? error.message : "";
    const cleaned = raw.replace(/^\[GoogleGenerativeAI Error\]:\s*/i, "").trim();

    if (!cleaned) {
        return "An unexpected error occurred while analyzing the profile.";
    }

    if (/function response turn comes immediately after a function call turn/i.test(cleaned)) {
        return "AI tool handoff failed during streaming. Please retry.";
    }

    if (/missing a thought_signature|thought_signature/i.test(cleaned)) {
        return "AI tool handoff failed during streaming. Please retry.";
    }

    return cleaned.length > 220 ? `${cleaned.slice(0, 217)}...` : cleaned;
}

function normalizeStreamingLabel(message: string): string {
    return message.replace(/[ \t]*(?:\.{3}|…)+\s*$/g, "").trim();
}

function formatToolStatusLabel(name: string, detail?: string): string {
    if (name === "googleSearch") {
        return detail ? `Searching Google for ${detail}` : "Searching Google";
    }

    if (detail) {
        if (detail.startsWith(`${name}(`)) {
            return `Calling ${detail}`;
        }
        return `Calling ${name}: ${detail}`;
    }

    return `Calling ${name}`;
}

export function ProfileChatInterface({
    profile,
    profileReadme,
    repoReadmes,
    recentCommits,
    recentCommitFreshnessLabel,
}: ProfileChatInterfaceProps) {
    const reduceMotion = useReducedMotion();
    const { data: session, status: sessionStatus } = useSession();
    const shouldUseCloudStorage = sessionStatus !== "unauthenticated";
    const [messages, setMessages] = useState<ProfileChatMessage[]>([
        {
            id: "welcome",
            role: "model",
            content: `Hello! I've analyzed **${profile.login}**'s GitHub profile${profileReadme ? ' and profile README' : ''}${repoReadmes.length > 0 ? `, along with ${repoReadmes.length} repository READMEs` : ''}. Ask me anything about their projects, skills, or contributions!`,
        },
    ]);
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const [input, setInput] = useState("");
    const [taggedFiles, setTaggedFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [focusSignal, setFocusSignal] = useState(0);
    const [composerNotice, setComposerNotice] = useState<ComposerNoticeState | null>(null);
    const submitRef = useRef<((e: React.FormEvent) => Promise<void>) | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const {
        selectionAnchor,
        referenceText,
        handleSelection,
        handleAskFromSelection,
        clearReference,
    } = useMessageSelection(chatScrollRef);

    const [initialized, setInitialized] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [modelPreference, setModelPreference] = useState<ModelPreference>("flash");
    const [crossRepoEnabled, setCrossRepoEnabled] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginModalCopy, setLoginModalCopy] = useState<{ title?: string; description?: string }>({});
    const [connectionLost, setConnectionLost] = useState(false);
    const [toolQuota, setToolQuota] = useState<ToolQuotaState | null>(null);
    const [showToolQuotaModal, setShowToolQuotaModal] = useState(false);
    const [quotaNowMs, setQuotaNowMs] = useState(() => Date.now());
    const isSubmittingRef = useRef(false);
    const activeRunKey = useMemo(() => `novaris:chatRun:profile:${profile.login}`, [profile.login]);

    const refreshToolQuota = useCallback(async () => {
        try {
            const response = await fetch("/api/chat/quota?scope=profile");
            if (!response.ok) {
                return null;
            }
            const quota = await response.json() as ToolQuotaState;
            return quota;
        } catch {
            return null;
        }
    }, []);

    const quotaSecondsRemaining = useMemo(() => {
        if (!toolQuota) {
            return 0;
        }
        const resetAtMs = Number.isFinite(Date.parse(toolQuota.resetAt)) ? Date.parse(toolQuota.resetAt) : 0;
        if (!resetAtMs) {
            return Math.max(0, toolQuota.windowSecondsRemaining);
        }
        return Math.max(0, Math.ceil((resetAtMs - quotaNowMs) / 1000));
    }, [toolQuota, quotaNowMs]);

    const quotaResetLabel = useMemo(() => formatDuration(quotaSecondsRemaining), [quotaSecondsRemaining]);
    const isToolQuotaExhausted = Boolean(toolQuota?.remaining === 0);

    if (!session && crossRepoEnabled) {
        setCrossRepoEnabled(false);
    }

    useEffect(() => {
        void refreshToolQuota().then((quota) => {
            if (quota) setToolQuota(quota);
        });
    }, [refreshToolQuota, session?.user?.id]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setQuotaNowMs(Date.now());
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);

    // Load conversation on mount
    const restoreGenerationRef = useRef(0);
    const skipNextAutoScrollRef = useRef(false);
    useEffect(() => {
        const restoreGeneration = restoreGenerationRef.current;
        const fetchConversation = async () => {
            const saved = await loadProfileConversation(profile.login, shouldUseCloudStorage);
            if (restoreGeneration !== restoreGenerationRef.current) {
                return;
            }
            if (saved && saved.length > 1) {
                setMessages((prev) => {
                    if (areProfileMessagesEquivalent(prev, saved)) {
                        return prev;
                    }
                    skipNextAutoScrollRef.current = true;
                    return saved;
                });
            }
            setInitialized(true);

            const storedRunId = typeof window !== "undefined" ? window.sessionStorage.getItem(activeRunKey) : null;
            if (storedRunId) {
                try {
                    const runRes = await fetch(`/api/chat/run?runId=${encodeURIComponent(storedRunId)}`);
                    if (runRes.ok) {
                        const run = await runRes.json() as {
                            runId: string;
                            status: ChatRunStatus;
                            partialText?: string;
                            finalText?: string | null;
                            errorMessage?: string | null;
                        };
                        if (restoreGeneration !== restoreGenerationRef.current) {
                            return;
                        }
                        const resumeMsgId = `run-${run.runId}`;
                        const text = (run.finalText ?? run.partialText ?? "").toString();
                        if (text) {
                            setMessages((prev) => {
                                const has = prev.some((m) => m.id === resumeMsgId);
                                if (has) {
                                    return prev.map((m) => (m.id === resumeMsgId ? { ...m, role: "model", content: text } : m));
                                }
                                return [...prev, { id: resumeMsgId, role: "model", content: text }];
                            });
                                    }

                        if (run.status === "RUNNING") {
                            setLoading(true);
                            setConnectionLost(true);
                            const poll = async () => {
                                try {
                                    const r = await fetch(`/api/chat/run?runId=${encodeURIComponent(storedRunId)}`);
                                    if (!r.ok) return;
                                    const next = await r.json() as { status: ChatRunStatus; partialText?: string; finalText?: string | null; errorMessage?: string | null };
                                    if (restoreGeneration !== restoreGenerationRef.current) {
                                        return;
                                    }
                                    const nextText = (next.finalText ?? next.partialText ?? "").toString();
                                    setMessages((prev) => prev.map((m) => (m.id === resumeMsgId ? { ...m, content: nextText } : m)));
                                    if (next.status === "COMPLETED") {
                                        setLoading(false);
                                        setConnectionLost(false);
                                        window.sessionStorage.removeItem(activeRunKey);
                                    } else if (next.status === "FAILED") {
                                        setLoading(false);
                                        setConnectionLost(false);
                                        window.sessionStorage.removeItem(activeRunKey);
                                    } else {
                                        setTimeout(poll, 1000);
                                    }
                                } catch {
                                    setTimeout(poll, 1500);
                                }
                            };
                            setTimeout(poll, 600);
                        } else if (run.status === "COMPLETED" || run.status === "FAILED") {
                            window.sessionStorage.removeItem(activeRunKey);
                        }
                    }
                } catch {
                    // Ignore resume failures.
                }
            }
        };
        fetchConversation();
    }, [profile.login, shouldUseCloudStorage, activeRunKey]);

    // Save on every message change
    useEffect(() => {
        if (initialized && messages.length > 1) {
            void saveProfileConversation(profile.login, messages, shouldUseCloudStorage);
        }
    }, [messages, initialized, profile.login, shouldUseCloudStorage]);

    // Calculate total token count
    const totalTokens = useMemo(() => {
        return countMessageTokens(messages.map(m => ({ role: m.role, parts: m.content })));
    }, [messages]);

    const tokenWarningLevel = getTokenWarningLevel(totalTokens);

    const { atBottom, jump: jumpToLatest } = useStickToBottom(chatScrollRef, messages);

    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
        setFocusSignal((n) => n + 1);
    };

    const buildCombinedInput = (trimmedInput: string, selectedReferenceText: string) => {
        let base = trimmedInput || "Please continue.";
        if (selectedReferenceText) {
            base = `Reference:\n> ${selectedReferenceText.replace(/\n/g, "\n> ")}\n\n${base}`;
        }
        return base;
    };

    const startProfileStreamMessage = (selectedModelPreference: ModelPreference) => {
        const modelMsgId = (Date.now() + 1).toString();
        setMessages((prev) => [
            ...prev,
            {
                id: modelMsgId,
                role: "model",
                content: "",
                reasoningSteps: [],
                modelUsed: selectedModelPreference,
                streamStatus: "Preparing profile analysis",
                streamProgress: 5,
            },
        ]);
        return modelMsgId;
    };

    const replaceOrAppendModelMessage = (
        targetMessageId: string | null | undefined,
        messageFactory: (id: string) => ProfileChatMessage
    ) => {
        setMessages((prev) => {
            if (targetMessageId && prev.some((message) => message.id === targetMessageId)) {
                return prev.map((message) =>
                    message.id === targetMessageId ? messageFactory(targetMessageId) : message
                );
            }
            return [...prev, messageFactory((Date.now() + 1).toString())];
        });
    };

    const removeMessageById = (targetMessageId: string | null | undefined) => {
        if (!targetMessageId) {
            return;
        }
        setMessages((prev) => prev.filter((message) => message.id !== targetMessageId));
    };

    const runProfileStreamingFlow = async (modelMsgId: string, combinedInputForServer: string, selectedModelPreference: ModelPreference) => {
        const isThinkingStream = selectedModelPreference === "thinking";
        const serverMessages = messagesRef.current.slice(-10).map((m) => {
            let content = m.content;
            if (m.role === "user" && m.taggedFiles && m.taggedFiles.length > 0) {
                content = `Focus on the following explicitly tagged repositories/files:\n${m.taggedFiles.map((f) => `- ${f}`).join("\n")}\n\n${content}`;
            }
            return {
                role: m.role,
                content: content,
            };
        });
        setConnectionLost(false);

        const clientRequestId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const runCreateRes = await fetch("/api/chat/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scope: "profile",
                username: profile.login,
                clientRequestId,
            }),
        });
        let runId: string | null = null;
        if (runCreateRes.ok) {
            const run = await runCreateRes.json() as { runId?: string };
            runId = typeof run.runId === "string" ? run.runId : null;
        }
        if (runId) {
            window.sessionStorage.setItem(activeRunKey, runId);
        }

        const response = await fetch("/api/chat/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: combinedInputForServer,
                profileContext: {
                    username: profile.login,
                    profile,
                    profileReadme,
                    repoReadmes,
                    recentCommits,
                    recentCommitFreshnessLabel,
                },
                history: serverMessages,
                modelPreference: selectedModelPreference,
                crossRepoEnabled,
                runId,
            }),
        });

        if (!response.ok || !response.body) {
            const rawResponseText = await response.text().catch(() => "");
            const parsedError = parseResponseError(rawResponseText, response.status);
            const httpError = new Error(parsedError.message) as HttpError;
            httpError.status = response.status;
            httpError.code = parsedError.code;
            httpError.message = parsedError.message;

            console.error("Profile chat stream initialization failed", {
                username: profile.login,
                status: response.status,
                statusText: response.statusText,
                historyMessageCount: serverMessages.length,
                queryPreview: combinedInputForServer.slice(0, 160),
                errorMessage: parsedError.message,
                errorCode: parsedError.code,
            });

            throw httpError;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const accumulatedReasoning: string[] = [];
        let contentText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            const parsedChunk = parseStreamChunk(buffer, decoder.decode(value, { stream: true }));
            buffer = parsedChunk.buffer;

            for (const invalidLine of parsedChunk.invalidLines) {
                console.warn("Stream parse error:", invalidLine);
            }

            for (const chunk of parsedChunk.updates) {
                if (chunk.type === "status") {
                    const normalizedStatus = normalizeStreamingLabel(chunk.message);
                    setMessages((prev) => prev.map((message) =>
                        message.id === modelMsgId
                            ? {
                                ...message,
                                reasoningSteps: isThinkingStream ? [...(accumulatedReasoning.concat(normalizedStatus))] : message.reasoningSteps,
                                streamStatus: normalizedStatus,
                                streamProgress: chunk.progress,
                            }
                            : message
                    ));
                    if (isThinkingStream) {
                        accumulatedReasoning.push(normalizedStatus);
                    }
                } else if (chunk.type === "tool") {
                    const toolStatus = formatToolStatusLabel(chunk.name, chunk.detail);
                    setMessages((prev) => prev.map((message) =>
                        message.id === modelMsgId
                            ? {
                                ...message,
                                reasoningSteps: isThinkingStream ? [...(accumulatedReasoning.concat(`Tool: ${toolStatus}`))] : message.reasoningSteps,
                                streamStatus: toolStatus,
                            }
                            : message
                    ));
                    if (isThinkingStream) {
                        accumulatedReasoning.push(`Tool: ${toolStatus}`);
                    }
                } else if (chunk.type === "thought") {
                    if (!isThinkingStream) {
                        continue;
                    }
                    accumulatedReasoning.push(chunk.text);
                    setMessages((prev) => prev.map((message) =>
                        message.id === modelMsgId ? { ...message, reasoningSteps: [...accumulatedReasoning] } : message
                    ));
                } else if (chunk.type === "content") {
                    if (!contentText && chunk.text) {
                        contentText = chunk.text.trimStart();
                    } else {
                        contentText += chunk.text;
                    }
                    setMessages((prev) => prev.map((message) =>
                        message.id === modelMsgId ? { ...message, content: contentText } : message
                    ));
                } else if (chunk.type === "error") {
                    const streamError = new Error(chunk.message) as HttpError;
                    streamError.code = chunk.code;
                    throw streamError;
                } else if (chunk.type === "complete") {
                    setMessages((prev) => prev.map((message) =>
                        message.id === modelMsgId
                            ? {
                                ...message,
                                commitFreshnessLabel: chunk.metadata?.commitFreshnessLabel,
                                toolsUsed: chunk.metadata?.toolsUsed,
                                processingSummary: chunk.metadata?.processingSummary,
                                sourceScope: chunk.metadata?.sourceScope,
                            }
                            : message
                    ));
                }
            }
        }

        if (buffer.trim()) {
            const finalChunk = parseStreamChunk("", `${buffer}\n`);
            for (const invalidLine of finalChunk.invalidLines) {
                console.warn("Stream parse error:", invalidLine);
            }
            for (const chunk of finalChunk.updates) {
                if (chunk.type === "content") {
                    if (!contentText && chunk.text) {
                        contentText = chunk.text.trimStart();
                    } else {
                        contentText += chunk.text;
                    }
                }
            }
        }

        setMessages((prev) => prev.map((message) =>
            message.id === modelMsgId
                ? { ...message, content: contentText, streamStatus: "Completed", streamProgress: 100 }
                : message
        ));

        if (runId) {
            window.sessionStorage.removeItem(activeRunKey);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        const trimmedInput = input.trim();
        if ((!trimmedInput && !referenceText) || loading) {
            isSubmittingRef.current = false;
            return;
        }

        // Check token limit
        if (totalTokens >= MAX_TOKENS) {
            toast.error("Conversation limit reached", {
                description: "Please clear the chat to start a new conversation.",
                duration: 5000,
            });
            isSubmittingRef.current = false;
            return;
        }

        setComposerNotice(null);

        const combinedInput = buildCombinedInput(trimmedInput, referenceText);

        const userMsg: ProfileChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: combinedInput,
            taggedFiles: taggedFiles.length > 0 ? [...taggedFiles] : undefined,
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setTaggedFiles([]);
        clearReference();
        setLoading(true);

        const previousToolQuotaRemaining = toolQuota?.remaining ?? null;
        let modelMsgId: string | null = null;
        try {
            let combinedInputForServer = combinedInput;
            if (taggedFiles.length > 0) {
                combinedInputForServer = `Focus on the following explicitly tagged repositories/files:\n${taggedFiles.map(f => `- ${f}`).join('\n')}\n\n${combinedInputForServer}`;
            }
            modelMsgId = startProfileStreamMessage(modelPreference);
            await runProfileStreamingFlow(modelMsgId, combinedInputForServer, modelPreference);
        } catch (error: unknown) {
            console.error(error);
            const errorStatus = getErrorStatus(error);
            const errorCode = (error as HttpError | undefined)?.code;
            const isAuthError = errorStatus === 401 || errorStatus === 403;
            const isPayloadTooLarge = errorStatus === 413;
            const isAnonUsageLimit = errorCode === "ANON_USAGE_LIMIT_EXCEEDED";
            const isAuthUsageLimit = errorCode === "AUTH_USAGE_LIMIT_EXCEEDED";
            const userFacingError = getUserFacingAnalysisError(error, errorCode);

            if (isAnonUsageLimit) {
                removeMessageById(modelMsgId);
                setComposerNotice({ tone: "warning", title: "Profile tool calls used up", body: "The anonymous profile tool budget is reached. Sign in to unlock 30 calls per day.", action: "sign-in" });
                setShowToolQuotaModal(true);
            } else if (isAuthUsageLimit) {
                replaceOrAppendModelMessage(modelMsgId, (id) => ({
                    id,
                    role: "model",
                    content: "Usage limit reached for profile chat tools.\n\nPlease contact **singhankit91624@gmail.com** for extended limits.",
                }));
                setShowToolQuotaModal(true);
            } else if (isAuthError) {
                removeMessageById(modelMsgId);
                setComposerNotice({ tone: "info", title: "Sign in to continue", body: "Your session has expired or is invalid. Sign in with GitHub and ask again.", action: "sign-in" });
                setLoginModalCopy({
                    title: "Sign In Required",
                    description: "Please sign in with GitHub to continue profile analysis features.",
                });
                setShowLoginModal(true);
            } else {
                if (isPayloadTooLarge) {
                    setComposerNotice({ tone: "warning", title: "That request was too large", body: "The profile context is too large. Ask a narrower question and try again." });
                } else if (isRateLimitError(error)) {
                    setComposerNotice({ tone: "warning", title: getRateLimitErrorMessage(error), body: "Wait a few moments before trying again." });
                }
                const failure: MessageFailure = {
                    code: errorCode ?? (errorStatus ? `HTTP_${errorStatus}` : "INTERNAL"),
                    message: isPayloadTooLarge ? "This request was too large to process. Try a narrower question focused on a specific project or timeframe." : userFacingError,
                    retryable: !isPayloadTooLarge,
                };
                replaceOrAppendModelMessage(modelMsgId, (id) => ({ id, role: "model", content: "", failure }));
            }
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
            if (typeof window !== "undefined") {
                window.sessionStorage.removeItem(activeRunKey);
            }
            const latestQuota = await refreshToolQuota();
            if (latestQuota) setToolQuota(latestQuota);
            if (
                latestQuota &&
                previousToolQuotaRemaining !== null &&
                previousToolQuotaRemaining > 0 &&
                latestQuota.remaining === 0
            ) {
                toast.error("Tool calls paused", {
                    description: "Profile tool calls are now paused for this window. You can continue in no-tool mode.",
                    duration: 5500,
                });
                setShowToolQuotaModal(true);
            }
        }
    };

    /** Re-ask the question behind a failed answer: drop the failed turn, then submit the same text. */
    const handleRetry = (failedId: string) => {
        if (loading || isSubmittingRef.current) return;
        const index = messages.findIndex((m) => m.id === failedId);
        const userMessage = index > 0 ? messages[index - 1] : undefined;
        if (!userMessage || userMessage.role !== "user") return;
        setMessages((prev) => prev.filter((m) => m.id !== failedId && m.id !== userMessage.id));
        setTaggedFiles(userMessage.taggedFiles ?? []);
        setInput(userMessage.content);
        window.setTimeout(() => void submitRef.current?.({ preventDefault() {} } as React.FormEvent), 60);
    };

    useEffect(() => {
        submitRef.current = handleSubmit;
    });

    const handleClearChat = async () => {
        restoreGenerationRef.current += 1;
        if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(activeRunKey);
        }
        await clearProfileConversation(profile.login, shouldUseCloudStorage);
        setLoading(false);
        setConnectionLost(false);
        setInitialized(true);
        setMessages([
            {
                id: "welcome",
                role: "model",
                content: `Hello! I've analyzed **${profile.login}**'s GitHub profile${profileReadme ? ' and profile README' : ''}${repoReadmes.length > 0 ? `, along with ${repoReadmes.length} repository READMEs` : ''}. Ask me anything about their projects, skills, or contributions!`,
            },
        ]);
        setComposerNotice(null);
        toast.success("Chat history cleared");
    };

    const handleCopyMessage = async (message: ProfileChatMessage) => {
        try {
            await copyChatMessageContent(message.content);
            setCopiedMessageId(message.id);
            setTimeout(() => {
                setCopiedMessageId((current) => (current === message.id ? null : current));
            }, COPY_FEEDBACK_MS);
            toast.success("Response copied");
        } catch {
            toast.error("Failed to copy response");
        }
    };

    const handleExportChat = async () => {
        const contextLabel = profile.login;
        await exportChatMessages({
            title: `${contextLabel} Chat Export`,
            contextLabel,
            messages,
        });
        toast.success("Chat exported");
    };

    const showHero = messages.length === 1 && messages[0]?.id === "welcome" && !loading;
    const transcript = messages.filter((m) => m.id !== "welcome");
    const lastId = messages[messages.length - 1]?.id;
    const displayName = profile.name || profile.login;
    const heroSuggestions: HeroSuggestion[] = [
        { label: PROFILE_SUGGESTIONS[0], hint: "Standout projects and what they do", icon: <Sparkles className="size-[1.1rem]" /> },
        { label: PROFILE_SUGGESTIONS[1], hint: "Expertise inferred from public work", icon: <Code2 className="size-[1.1rem]" /> },
        { label: PROFILE_SUGGESTIONS[2], hint: "A walkthrough of the top repositories", icon: <BookMarked className="size-[1.1rem]" /> },
        { label: PROFILE_SUGGESTIONS[3], hint: "Languages across their repositories", icon: <Languages className="size-[1.1rem]" /> },
    ];
    const joined = new Date(profile.created_at).getFullYear();

    return (
        <div className="nv-workspace relative z-10 flex h-[100dvh] text-nv-ivory-50" data-slot="profile-chat">
            <div className={cn("flex min-w-0 flex-1 flex-col", s.stage)}>
                <header className={`${s.glass} relative z-30 shrink-0 border-b border-nv-graphite-700 px-3 py-3 sm:px-5`}>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link href="/" aria-label="Back to home" className="grid size-11 shrink-0 place-items-center rounded-nv-sm text-nv-ivory-200 transition-colors hover:bg-nv-graphite-850 hover:text-nv-ivory-50">
                            <ArrowLeft aria-hidden className="size-5" />
                        </Link>
                        {/* Profile avatars use source URLs from GitHub and remain intentionally unoptimized here. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={profile.avatar_url} alt="" width={44} height={44} className="nv-holo-ring size-11 shrink-0 !rounded-full border border-white object-cover shadow-nv-card" />
                        <div className="min-w-0 flex-1">
                            <h1 className="nv-display m-0 flex min-w-0 items-baseline gap-2 text-[1.0625rem] leading-tight sm:text-[1.25rem]">
                                <span className="truncate">{displayName}</span>
                                <span className="truncate font-nv-mono text-nv-micro font-normal tracking-normal text-nv-ivory-300">@{profile.login}</span>
                            </h1>
                            <p className="nv-num m-0 mt-0.5 flex flex-wrap items-center gap-x-3 text-nv-micro text-nv-ivory-300">
                                <span className="inline-flex items-center gap-1"><BookMarked aria-hidden className="size-3" />{profile.public_repos.toLocaleString()} repos</span>
                                <span className="inline-flex items-center gap-1"><Users aria-hidden className="size-3" />{profile.followers.toLocaleString()} followers</span>
                                {profile.location && <span className="hidden items-center gap-1 sm:inline-flex"><MapPin aria-hidden className="size-3" />{profile.location}</span>}
                                <span className="hidden sm:inline">On GitHub since {joined}</span>
                            </p>
                        </div>
                        <a href={profile.html_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-nv-sm border border-nv-graphite-600 bg-white px-3 text-nv-small font-medium text-nv-ivory-100 shadow-nv-xs transition-colors hover:border-nv-graphite-500">
                            <Github aria-hidden className="size-4" />
                            <span className="hidden sm:inline">View on GitHub</span>
                            <span className="sr-only sm:hidden">View on GitHub</span>
                        </a>
                    </div>
                </header>
                <WorkspaceToolbar
                    meters={{
                        tokens: { used: formatTokenCount(totalTokens), max: formatTokenCount(MAX_TOKENS), fill: totalTokens / MAX_TOKENS, level: tokenWarningLevel },
                        quota: toolQuota ? { remaining: toolQuota.remaining, limit: toolQuota.limit, exhausted: isToolQuotaExhausted, onClick: () => setShowToolQuotaModal(true) } : undefined,
                    }}
                    onExport={handleExportChat}
                    onClear={() => setShowClearConfirm(true)}
                    lead={<p className="m-0 hidden text-nv-small text-nv-ivory-300 md:block">Conversation about <span className="font-medium text-nv-ivory-100">{profile.login}</span></p>}
                />

                <div className="relative min-h-0 flex-1">
                    <div
                        ref={chatScrollRef}
                        onMouseUp={handleSelection}
                        data-hero={showHero || undefined}
                        role="region"
                        aria-label="Conversation"
                        tabIndex={-1}
                        className="relative h-full overflow-y-auto overscroll-contain scroll-smooth selection:bg-nv-copper-400/20 [&_*::selection]:bg-nv-copper-400/20"
                    >
                        {connectionLost && (
                            <div className="mx-auto w-full max-w-[46rem] px-4 pt-4 sm:px-6">
                                <Notice tone="info" title="Connection lost">We will keep saving the response and reconnect when possible.</Notice>
                            </div>
                        )}
                        {selectionAnchor && (
                            <button
                                onClick={handleAskFromSelection}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                }}
                                onMouseUp={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                }}
                                className="absolute z-20 -mt-2 -translate-y-full rounded-full bg-nv-ivory-100 px-3.5 py-1.5 text-xs font-medium text-white shadow-nv-popover transition-transform duration-150 ease-out hover:scale-105"
                                style={{ left: selectionAnchor.x, top: selectionAnchor.y }}
                            >
                                Ask Novaris about this
                            </button>
                        )}

                        {showHero ? (
                            <ChatHero
                                eyebrow="Developer profile workspace"
                                lead="Ask anything about"
                                accent={displayName}
                                facts={[`${profile.public_repos.toLocaleString()} public repositories`, ...(repoReadmes.length > 0 ? [`${repoReadmes.length} READMEs read`] : []), ...(profileReadme ? ["Profile README read"] : [])]}
                                suggestions={heroSuggestions}
                                onPick={handleSuggestionClick}
                            />
                        ) : (
                            <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-10 px-4 pb-12 pt-8 sm:px-6">
                                {transcript.map((msg) => {
                                    const isLatestMessage = msg.id === lastId;
                                    const isActiveModelStreamState = msg.role === "model" && loading && isLatestMessage && (Boolean(msg.streamStatus) || msg.modelUsed === "thinking");
                                    if (msg.role === "model" && !msg.content && !msg.failure && !isActiveModelStreamState) return null;
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ type: "spring", duration: 0.45, bounce: 0 }}
                                            className="min-w-0"
                                        >
                                            <ChatMessage
                                                message={msg}
                                                allMessages={messages}
                                                streaming={loading && isLatestMessage && msg.role === "model"}
                                                currentOwner={profile.login}
                                                onCopy={handleCopyMessage}
                                                copied={copiedMessageId === msg.id}
                                                onRetry={handleRetry}
                                            />
                                        </motion.div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {!atBottom && !showHero && (
                        <button
                            type="button"
                            onClick={() => jumpToLatest()}
                            className="nv-fade absolute bottom-4 left-1/2 z-20 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-nv-graphite-600 bg-white px-4 text-nv-small font-medium text-nv-ivory-100 shadow-nv-popover transition-colors hover:border-nv-copper-600 hover:text-nv-copper-300"
                        >
                            <ArrowDown aria-hidden className="size-4" />
                            {loading ? "Jump to live answer" : "Latest"}
                        </button>
                    )}
                </div>

                <div className="relative z-30 shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-5">
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-nv-graphite-950 to-transparent" />
                    <div className="mx-auto w-full max-w-[46rem] space-y-3">
                        {composerNotice && (
                            <Notice
                                tone={composerNotice.tone}
                                title={composerNotice.title}
                                action={
                                    composerNotice.action === "sign-in" ? (
                                        <Button variant="primary" onClick={() => setShowLoginModal(true)}>Sign in</Button>
                                    ) : (
                                        <Button variant="ghost" onClick={() => setComposerNotice(null)} aria-label="Dismiss notice"><X aria-hidden className="size-4" /></Button>
                                    )
                                }
                            >
                                {composerNotice.body}
                            </Notice>
                        )}
                        {isToolQuotaExhausted && !composerNotice && (
                            <p role="status" className="m-0 flex flex-wrap items-center gap-x-2 rounded-full border border-nv-warning-edge bg-nv-warning-wash px-4 py-1.5 text-nv-small text-nv-warning">
                                <span className="font-medium">Tool calls paused.</span>
                                <span>Live lookups resume in <span className="nv-num">{quotaResetLabel}</span>.</span>
                                <button type="button" onClick={() => setShowToolQuotaModal(true)} className="ml-auto min-h-8 font-medium underline underline-offset-2">Details</button>
                            </p>
                        )}
                        {referenceText && (
                            <div className="flex items-center gap-3 rounded-nv-md border border-nv-copper-700 bg-nv-copper-wash px-3 py-2 text-nv-small text-nv-ivory-200">
                                <span className="nv-eyebrow shrink-0 !text-nv-copper-400">Quoting</span>
                                <span className="min-w-0 flex-1 truncate">{referenceText}</span>
                                <button type="button" onClick={clearReference} className="grid size-11 shrink-0 place-items-center rounded-nv-sm text-nv-ivory-300 hover:bg-white hover:text-nv-ivory-50" aria-label="Remove quoted text">
                                    <X aria-hidden className="size-4" />
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="relative">
                            <ChatInput
                                focusSignal={focusSignal}
                                value={input}
                                onChange={setInput}
                                onSubmit={handleSubmit}
                                placeholder={
                                    totalTokens >= MAX_TOKENS
                                        ? "Conversation limit reached. Please clear chat."
                                        : isToolQuotaExhausted
                                            ? "Tool calls are paused. You can still ask in no-tool mode."
                                            : `Ask about ${profile.login}'s projects and skills (use @ or drop to tag)...`
                                }
                                disabled={totalTokens >= MAX_TOKENS}
                                disabledReason={totalTokens >= MAX_TOKENS ? "This conversation is at its length limit. Clear the chat to start a new one." : undefined}
                                loading={loading}
                                allowEmptySubmit={Boolean(referenceText) || taggedFiles.length > 0}
                                repositoryFiles={repoReadmes.map(r => ({ path: r.repo, type: "blob" as const }))}
                                taggedFiles={taggedFiles}
                                onTaggedFilesChange={setTaggedFiles}
                                modelPreference={modelPreference}
                                setModelPreference={setModelPreference}
                                onRequireAuth={() => {
                                    setLoginModalCopy({
                                        title: "Login Required For Thinking Mode",
                                        description: "Sign in to use Thinking Mode, higher limits, and advanced profile tooling.",
                                    });
                                    setShowLoginModal(true);
                                }}
                                showCrossRepoToggle={true}
                                crossRepoEnabled={crossRepoEnabled}
                                setCrossRepoEnabled={setCrossRepoEnabled}
                                onRequireCrossRepoAuth={() => {
                                    setLoginModalCopy({
                                        title: "Login Required For Cross-Repo",
                                        description: "Cross-repo profile analysis is available for logged-in users with higher tool limits.",
                                    });
                                    setShowLoginModal(true);
                                }}
                            />
                        </form>
                        <p className="m-0 text-center text-nv-micro text-nv-ivory-300">Answers come from public GitHub data. Check the linked repositories before relying on them.</p>
                    </div>
                </div>
            </div>

            <aside aria-label="Loaded context" className="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-nv-graphite-700 bg-white/60 xl:flex">
                <div className="border-b border-nv-graphite-700 px-5 py-4">
                    <p className="nv-eyebrow">Context loaded</p>
                    <p className="m-0 mt-1.5 text-nv-small text-nv-ivory-200">What the answers can draw on. {recentCommitFreshnessLabel}</p>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2 overflow-y-auto p-4">
                    {profileReadme && (
                        <li className="rounded-nv-md border border-nv-graphite-700 bg-white p-3 text-nv-small shadow-nv-xs">
                            <p className="m-0 font-medium text-nv-ivory-50">Profile README</p>
                            <p className="m-0 mt-0.5 text-nv-micro text-nv-ivory-300">{profile.login}/{profile.login}</p>
                        </li>
                    )}
                    {recentCommits.length > 0 && (
                        <li className="rounded-nv-md border border-nv-graphite-700 bg-white p-3 text-nv-small shadow-nv-xs">
                            <p className="m-0 font-medium text-nv-ivory-50">Recent commits</p>
                            <p className="nv-num m-0 mt-0.5 text-nv-micro text-nv-ivory-300">{recentCommits.length} across {new Set(recentCommits.map((c) => c.repo)).size} repositories</p>
                        </li>
                    )}
                    {repoReadmes.map((r) => (
                        <li key={r.repo}>
                            <button
                                type="button"
                                onClick={() => handleSuggestionClick(`Tell me about the ${r.repo} repository`)}
                                className="nv-lift group w-full rounded-nv-md border border-nv-graphite-700 bg-white p-3 text-left text-nv-small shadow-nv-xs"
                            >
                                <span className="flex items-center justify-between gap-2">
                                    <span className="truncate font-nv-mono text-[0.78rem] font-medium text-nv-ivory-50">{r.repo}</span>
                                    <span className="nv-num inline-flex shrink-0 items-center gap-1 text-nv-micro text-nv-ivory-300"><Star aria-hidden className="size-3" />{r.stars.toLocaleString()}</span>
                                </span>
                                {r.description && <span className="mt-1 line-clamp-2 block text-nv-micro leading-snug text-nv-ivory-300">{r.description}</span>}
                                {r.language && <span className="mt-2 inline-block rounded-full bg-nv-graphite-850 px-2 py-px text-[0.6875rem] text-nv-ivory-200">{r.language}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>

            <ConfirmDialog
                isOpen={showClearConfirm}
                title="Clear Chat History?"
                message="This will permanently delete all messages in this conversation. This action cannot be undone."
                confirmText="Clear Chat"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleClearChat}
                onCancel={() => setShowClearConfirm(false)}
            />

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                title={loginModalCopy.title}
                description={loginModalCopy.description}
            />

            {toolQuota && (
                <ToolQuotaModal
                    isOpen={showToolQuotaModal}
                    onClose={() => setShowToolQuotaModal(false)}
                    scope="profile"
                    audience={toolQuota.audience}
                    used={toolQuota.used}
                    limit={toolQuota.limit}
                    remaining={toolQuota.remaining}
                    resetCountdown={quotaResetLabel}
                    supportEmail={SUPPORT_EMAIL}
                />
            )}
        </div>
    );
}
