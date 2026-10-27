import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ArrowDown, Folder, Gauge, GitFork, Layers, Network, Shield, Workflow, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CopySquaresIcon } from "@/components/icons/CopySquaresIcon";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";

import { scanRepositoryVulnerabilities, fetchProfile, getRemainingDeepScans, getLatestRepoScanId, createScanShareLink } from "@/app/actions";
import { cn } from "@/lib/utils";
import { countMessageTokens, formatTokenCount, getTokenWarningLevel, isRateLimitError, getRateLimitErrorMessage, MAX_TOKENS } from "@/lib/tokens";
import { saveConversation, loadConversation, clearConversation } from "@/lib/storage";
import {
    ARCHITECTURE_PROMPT,
    COPY_FEEDBACK_MS,
    DEEP_SCAN_PROMPT,
    INITIAL_PROMPT_DELAY_MS,
    MAX_FINDINGS_PREVIEW,
    QUICK_SCAN_PROMPT,
} from "@/lib/chat-constants";
import { copyChatMessageContent, exportChatMessages } from "@/lib/chat-message-actions";
import { parseStreamChunk } from "@/lib/streaming-parser";

import { SearchModal } from "./SearchModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { ChatInput } from "./ChatInput";
import { LoginModal } from "./LoginModal";
import { Button } from "@/components/nv/button";
import { Notice } from "@/components/nv/notice";
import type { ModelPreference } from "@/lib/ai-client";
import type { MessageFailure, RepoChatMessage } from "@/lib/chat-types";

import { ChatMessage } from "./chat/ChatMessage";
import { ChatHero, type HeroSuggestion } from "./chat/ChatHero";
import { WorkspaceToolbar } from "./chat/WorkspaceToolbar";
import { useStickToBottom } from "./chat/use-stick-to-bottom";
import s from "./chat/chat.module.css";
import { useMessageSelection } from "./chat/useMessageSelection";
import { BadgeModal } from "./chat/BadgeModal";
import { SecurityScanModal } from "./chat/SecurityScanModal";
import { buildSecurityScanMessage } from "./chat/security-scan-message";
import { ToolQuotaModal } from "./chat/ToolQuotaModal";

const REPO_SUGGESTIONS = [
    "Show me the user flow chart",
    "Evaluate code quality",
    "What's the tech stack?",
    ARCHITECTURE_PROMPT,
];

interface ComposerNoticeState {
    tone: "info" | "warning";
    title: string;
    body: string;
    action?: "sign-in";
}

interface RepoFileNode {
    path: string;
    sha?: string;
    type?: "blob" | "tree";
}

type OwnerProfile = Awaited<ReturnType<typeof fetchProfile>>;

interface ChatInterfaceProps {
    repoContext: { owner: string; repo: string; fileTree: RepoFileNode[] };
    onToggleSidebar?: () => void;
    initialPrompt?: string;
}

type SubmitMode = "normal" | "quick_scan" | "deep_scan";
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

function areRepoMessagesEquivalent(left: RepoChatMessage[], right: RepoChatMessage[]): boolean {
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

// Keep this in sync with server-side pruneFilePaths to avoid sending noisy/binary paths in request payloads.
const REQUEST_FILE_PATH_SKIP_PATTERN =
    /(\.(png|jpg|jpeg|gif|svg|ico|lock|pdf|zip|tar|gz|map|wasm|min\.js|min\.css|woff|woff2|ttf|otf|eot)|package-lock\.json|yarn\.lock)$/i;

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
        return "An unexpected error occurred while analyzing the code.";
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

export function ChatInterface({ repoContext, onToggleSidebar, initialPrompt }: ChatInterfaceProps) {
    const reduceMotion = useReducedMotion();
    const { data: session, status: sessionStatus } = useSession();
    const shouldUseCloudStorage = sessionStatus !== "unauthenticated";
    const [messages, setMessages] = useState<RepoChatMessage[]>([
        {
            id: "welcome",
            role: "model",
            content: `Hello! I've analyzed **${repoContext.owner}/${repoContext.repo}**. Ask me anything about the code structure, dependencies, or specific features.`,
        },
    ]);
    const [input, setInput] = useState("");
    const [taggedFiles, setTaggedFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [focusSignal, setFocusSignal] = useState(0);
    const [composerNotice, setComposerNotice] = useState<ComposerNoticeState | null>(null);
    const [scanning, setScanning] = useState(false);
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
    const [connectionLost, setConnectionLost] = useState(false);

    const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginModalCopy, setLoginModalCopy] = useState<{ title?: string; description?: string }>({});
    const [deepScansData, setDeepScansData] = useState<{ used: number; total: number; resetsAt: string; isUnlimited: boolean } | null>(null);
    const [latestScanId, setLatestScanId] = useState<string | null>(null);
    const [toolQuota, setToolQuota] = useState<ToolQuotaState | null>(null);
    const [showToolQuotaModal, setShowToolQuotaModal] = useState(false);
    const [quotaNowMs, setQuotaNowMs] = useState(() => Date.now());
    const activeRunKey = useMemo(() => `novaris:chatRun:repo:${repoContext.owner}:${repoContext.repo}`, [repoContext.owner, repoContext.repo]);

    const handleSubmitRef = useRef<((e?: React.FormEvent, overrideText?: string, submitMode?: SubmitMode, scanAiAssist?: boolean) => Promise<void>) | null>(null);
    const isSubmittingRef = useRef(false);

    const refreshToolQuota = useCallback(async () => {
        try {
            const response = await fetch("/api/chat/quota?scope=repo");
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

    // Fetch deep scan limits on mount/session change
    useEffect(() => {
        if (session?.user) {
            getRemainingDeepScans().then(setDeepScansData).catch(console.error);
        }
        if (showSecurityModal) {
            getLatestRepoScanId(repoContext.owner, repoContext.repo)
                .then(setLatestScanId)
                .catch(console.error);
        }
    }, [session?.user, showSecurityModal, repoContext.owner, repoContext.repo]);

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

    // Fetch owner profile on mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await fetchProfile(repoContext.owner);
                setOwnerProfile(profile);
            } catch (e) {
                console.error("Failed to load owner profile:", e);
            }
        };
        loadProfile();
    }, [repoContext.owner]);

    // Load conversation on mount
    const initialPromptHandled = useRef(false);
    const restoreGenerationRef = useRef(0);
    const skipNextAutoScrollRef = useRef(false);

    useEffect(() => {
        const restoreGeneration = restoreGenerationRef.current;
        const fetchConversation = async () => {
            const saved = await loadConversation(repoContext.owner, repoContext.repo, shouldUseCloudStorage);
            if (restoreGeneration !== restoreGenerationRef.current) {
                return;
            }
            if (saved && saved.length > 1) {
                setMessages((prev) => {
                    if (areRepoMessagesEquivalent(prev, saved)) {
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

            if (initialPrompt && !initialPromptHandled.current) {
                initialPromptHandled.current = true;
                let promptText = "";
                if (initialPrompt === "architecture") promptText = ARCHITECTURE_PROMPT;
                else if (initialPrompt === "security") promptText = QUICK_SCAN_PROMPT;
                else if (initialPrompt === "explain") promptText = "Explain the codebase";
                else promptText = initialPrompt;

                const url = new URL(window.location.href);
                url.searchParams.delete('prompt');
                window.history.replaceState({}, '', url.toString());

                setTimeout(() => {
                    if (handleSubmitRef.current) {
                        handleSubmitRef.current(undefined, promptText);
                    }
                }, INITIAL_PROMPT_DELAY_MS);
            }
        };

        fetchConversation();
    }, [repoContext.owner, repoContext.repo, initialPrompt, shouldUseCloudStorage, activeRunKey]);

    // Save on every message change
    useEffect(() => {
        if (initialized && messages.length > 1) {
            void saveConversation(repoContext.owner, repoContext.repo, messages, shouldUseCloudStorage);
        }
    }, [messages, initialized, repoContext.owner, repoContext.repo, shouldUseCloudStorage]);

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

    // Other parts of the workspace (file explorer, codebase map) can prefill the composer.
    useEffect(() => {
        const prefill = (event: Event) => {
            const text = (event as CustomEvent<string>).detail;
            if (typeof text !== "string" || !text) return;
            setInput(text);
            setFocusSignal((n) => n + 1);
        };
        window.addEventListener("prefill-composer", prefill);
        return () => window.removeEventListener("prefill-composer", prefill);
    }, []);

    const buildCombinedInput = (trimmedInput: string, selectedReferenceText: string) => {
        let base = trimmedInput || "Please continue.";
        if (selectedReferenceText) {
            base = `Reference:\n> ${selectedReferenceText.replace(/\n/g, "\n> ")}\n\n${base}`;
        }
        return base;
    };

    const isQuickSecurityScanPrompt = (text: string) => {
        const normalized = text.toLowerCase();
        return normalized.includes(QUICK_SCAN_PROMPT.toLowerCase()) || normalized.includes("scan for vulnerabilities");
    };

    const isDeepSecurityScanPrompt = (text: string) => {
        const normalized = text.toLowerCase();
        return normalized.includes(DEEP_SCAN_PROMPT.toLowerCase()) || normalized.includes("deep scan");
    };

    const runSecurityScanFlow = async (
        isQuickScan: boolean,
        isDeepScan: boolean,
        placeholderMessageId: string
    ) => {
        console.log(`🎯 Security scan triggered! (Type: ${isDeepScan ? "Deep" : "Quick"})`);
        setScanning(true);
        try {
            const filesToScan = repoContext.fileTree.map((file) => ({ path: file.path, sha: file.sha }));
            const { findings, summary, scanId, meta } = await scanRepositoryVulnerabilities(
                repoContext.owner,
                repoContext.repo,
                filesToScan,
                {
                    analysisProfile: isDeepScan ? "deep" : "quick",
                    aiAssist: "on",
                }
            );

            const content = buildSecurityScanMessage({
                summary,
                findings,
                isFromCache: Boolean(meta?.fromCache),
                maxFindingsPreview: MAX_FINDINGS_PREVIEW,
            });

            const modelMsg: RepoChatMessage = {
                id: placeholderMessageId,
                role: "model",
                content,
                vulnerabilities: findings,
                isQuickSecurityScan: isQuickScan && !isDeepScan,
                scanId,
            };
            setMessages((prev) => prev.map((message) =>
                message.id === placeholderMessageId ? modelMsg : message
            ));
            // Update latest scan ID after successful scan
            if (scanId) {
                setLatestScanId(scanId);
            }
        } catch (error) {
            console.error("Scan failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An error occurred during scanning";
            const isDeepScanLimitReached = isDeepScan && /monthly deep scan limit reached/i.test(errorMessage);

            toast.error(isDeepScanLimitReached ? "Deep scan limit exhausted" : "Security scan failed", {
                description: isDeepScanLimitReached
                    ? "Your monthly deep scan limit is exhausted. Contact admin singhankit91624@gmail.com for more reasonable limits."
                    : errorMessage,
            });

            const errorMsg: RepoChatMessage = isDeepScanLimitReached
                ? {
                    id: placeholderMessageId,
                    role: "model",
                    content: "Your deep scan limit is exhausted for this month.\n\nPlease contact admin at **singhankit91624@gmail.com** for more reasonable limits.",
                }
                : {
                    id: placeholderMessageId,
                    role: "model",
                    content: "I encountered an error while scanning for security vulnerabilities. Please try again.",
                };
            setMessages((prev) => prev.map((message) =>
                message.id === placeholderMessageId ? errorMsg : message
            ));
        } finally {
            setScanning(false);
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const getRepoQueryForServer = (trimmedInput: string, combinedInput: string) => {
        if (trimmedInput.toLowerCase() === ARCHITECTURE_PROMPT.toLowerCase()) {
            return "Explain the architecture of this repository in detail. Provide a comprehensive overview of the core logic, framework setup, data flow, and key components based on the actual code, not just the README. Include a visual architecture diagram, preferring an SVG code block when possible (Mermaid is acceptable fallback).";
        }
        return combinedInput;
    };

    const startRepoStreamMessage = (selectedModelPreference: ModelPreference) => {
        const modelMsgId = (Date.now() + 1).toString();
        setMessages((prev) => [...prev, {
            id: modelMsgId,
            role: "model",
            content: "",
            reasoningSteps: [],
            relevantFiles: [],
            modelUsed: selectedModelPreference,
            streamStatus: "Selecting relevant files",
            streamProgress: 5,
        }]);
        return modelMsgId;
    };

    const replaceOrAppendModelMessage = (
        targetMessageId: string | null | undefined,
        messageFactory: (id: string) => RepoChatMessage
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

    const runRepoStreamingFlow = async (
        modelMsgId: string,
        combinedInputForServer: string,
        selectedModelPreference: ModelPreference
    ) => {
        const isThinkingStream = selectedModelPreference === "thinking";
        const eligibleFiles = repoContext.fileTree
            .filter((path) =>
                !REQUEST_FILE_PATH_SKIP_PATTERN.test(path.path) &&
                !path.path.includes("node_modules/") &&
                !path.path.includes(".git/")
            );
        const filePaths = eligibleFiles.map((file) => file.path);
        const fileShas = Object.fromEntries(
            eligibleFiles
                .filter((file) => typeof file.sha === "string" && file.sha.length > 0)
                .map((file) => [file.path, file.sha as string])
        );
        const historyForServer = messages.slice(-8).map((message) => {
            let content = message.content;
            if (message.role === "user" && message.taggedFiles && message.taggedFiles.length > 0) {
                content = `Focus on the following explicitly tagged files:\n${message.taggedFiles.map(f => `- ${f}`).join('\n')}\n\n${content}`;
            }
            return { role: message.role, content };
        });
        setConnectionLost(false);

        const clientRequestId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const runCreateRes = await fetch("/api/chat/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scope: "repo",
                owner: repoContext.owner,
                repo: repoContext.repo,
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

        const response = await fetch("/api/chat/repo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: combinedInputForServer,
                repoDetails: { owner: repoContext.owner, repo: repoContext.repo },
                filePaths,
                fileShas,
                history: historyForServer,
                profileData: ownerProfile,
                modelPreference: selectedModelPreference,
                runId,
            }),
        });

        if (!response.ok || !response.body) {
            const rawResponseText = await response.text().catch(() => "");
            const parsedError = parseResponseError(rawResponseText, response.status);
            const httpError = new Error(parsedError.message) as HttpError;
            httpError.status = response.status;
            httpError.code = parsedError.code;

            console.error("Repo chat stream initialization failed", {
                owner: repoContext.owner,
                repo: repoContext.repo,
                status: response.status,
                statusText: response.statusText,
                filePathCount: filePaths.length,
                historyMessageCount: historyForServer.length,
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
        let finalRelevantFiles: string[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

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
                } else if (chunk.type === "files") {
                    setMessages((prev) => prev.map((message) =>
                        message.id === modelMsgId ? { ...message, relevantFiles: chunk.files } : message
                    ));
                } else if (chunk.type === "complete") {
                    finalRelevantFiles = chunk.relevantFiles ?? [];
                    setMessages((prev) => prev.map((message) =>
                        message.id === modelMsgId
                            ? {
                                ...message,
                                relevantFiles: finalRelevantFiles,
                                commitFreshnessLabel: chunk.metadata?.commitFreshnessLabel,
                                toolsUsed: chunk.metadata?.toolsUsed,
                                processingSummary: chunk.metadata?.processingSummary,
                                sourceScope: chunk.metadata?.sourceScope,
                                streamStatus: "Completed",
                                streamProgress: 100,
                            }
                            : message
                    ));
                } else if (chunk.type === "error") {
                    const streamError = new Error(chunk.message) as HttpError;
                    streamError.code = chunk.code;
                    throw streamError;
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

        setMessages(prev => prev.map(m =>
            m.id === modelMsgId
                ? { ...m, content: contentText, streamStatus: "Completed", streamProgress: 100 }
                : m
        ));

        if (runId) {
            window.sessionStorage.removeItem(activeRunKey);
        }
    };

    const handleSubmit = async (
        e?: React.FormEvent,
        overrideText?: string,
        submitMode: SubmitMode = "normal"
    ) => {
        if (e) e.preventDefault();

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        const trimmedInput = overrideText || input.trim();
        if ((!trimmedInput && !referenceText) || loading) {
            isSubmittingRef.current = false;
            return;
        }

        const isQuickScan = submitMode === "quick_scan" || isQuickSecurityScanPrompt(trimmedInput);
        const isDeepScan = submitMode === "deep_scan" || isDeepSecurityScanPrompt(trimmedInput);
        const selectedModelPreference: ModelPreference = modelPreference;

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

        const userMsg: RepoChatMessage = {
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

        if (isQuickScan || isDeepScan) {
            const placeholderMessageId = `scan-${Date.now()}`;
            const placeholderMsg: RepoChatMessage = {
                id: placeholderMessageId,
                role: "model",
                content: "",
                scanStatus: isDeepScan ? "deep_running" : "quick_running",
            };
            setMessages((prev) => [...prev, placeholderMsg]);
            await runSecurityScanFlow(isQuickScan, isDeepScan, placeholderMessageId);
            return;
        }

        const previousToolQuotaRemaining = toolQuota?.remaining ?? null;
        let modelMsgId: string | null = null;
        try {
            let combinedInputForServer = getRepoQueryForServer(trimmedInput, combinedInput);
            if (taggedFiles.length > 0) {
                combinedInputForServer = `Focus on the following explicitly tagged files:\n${taggedFiles.map(f => `- ${f}`).join('\n')}\n\n${combinedInputForServer}`;
            }
            modelMsgId = startRepoStreamMessage(selectedModelPreference);
            await runRepoStreamingFlow(modelMsgId, combinedInputForServer, selectedModelPreference);
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
                setComposerNotice({ tone: "warning", title: "Repo tool calls used up", body: "The anonymous repo tool budget is reached. Sign in to unlock 30 calls per day.", action: "sign-in" });
                setShowToolQuotaModal(true);
            } else if (isAuthUsageLimit) {
                replaceOrAppendModelMessage(modelMsgId, (id) => ({
                    id,
                    role: "model",
                    content: "Usage limit reached for repo chat tools.\n\nPlease contact **singhankit91624@gmail.com** for extended limits.",
                }));
                setShowToolQuotaModal(true);
            } else if (isAuthError) {
                removeMessageById(modelMsgId);
                setComposerNotice({ tone: "info", title: "Sign in to continue", body: "Your session has expired or is invalid. Sign in with GitHub and ask again.", action: "sign-in" });
                setLoginModalCopy({
                    title: "Sign In Required",
                    description: "Please sign in with GitHub to continue repo analysis features.",
                });
                setShowLoginModal(true);
            } else {
                if (isPayloadTooLarge) {
                    setComposerNotice({ tone: "warning", title: "That request was too large", body: "This repository is large. Ask about a specific folder or feature and try again." });
                } else if (isRateLimitError(error)) {
                    setComposerNotice({ tone: "warning", title: getRateLimitErrorMessage(error), body: "Wait a few moments before trying again." });
                }
                const failure: MessageFailure = {
                    code: errorCode ?? (errorStatus ? `HTTP_${errorStatus}` : "INTERNAL"),
                    message: isPayloadTooLarge ? "This request was too large to process. Try a narrower question focused on a specific module or folder." : userFacingError,
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
                    description: "Repo tool calls are now paused for this window. You can continue in no-tool mode.",
                    duration: 5500,
                });
                setShowToolQuotaModal(true);
            }
        }
    };

    useEffect(() => {
        handleSubmitRef.current = handleSubmit;
    });

    /** Re-ask the question behind a failed answer: drop the failed turn, then submit the same text. */
    const handleRetry = (failedId: string) => {
        if (loading || isSubmittingRef.current) return;
        const index = messages.findIndex((m) => m.id === failedId);
        const userMessage = index > 0 ? messages[index - 1] : undefined;
        if (!userMessage || userMessage.role !== "user") return;
        setMessages((prev) => prev.filter((m) => m.id !== failedId && m.id !== userMessage.id));
        setTaggedFiles(userMessage.taggedFiles ?? []);
        window.setTimeout(() => handleSubmitRef.current?.(undefined, userMessage.content), 60);
    };

    const handleClearChat = async () => {
        restoreGenerationRef.current += 1;
        if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(activeRunKey);
        }
        await clearConversation(repoContext.owner, repoContext.repo, shouldUseCloudStorage);
        setLoading(false);
        setConnectionLost(false);
        setInitialized(true);
        setMessages([
            {
                id: "welcome",
                role: "model",
                content: `Hello! I've analyzed **${repoContext.owner}/${repoContext.repo}**. Ask me anything about the code structure, dependencies, or specific features.`,
            },
        ]);
        setComposerNotice(null);
        toast.success("Chat history cleared");
    };

    const handleCopyMessage = async (message: RepoChatMessage) => {
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
        const contextLabel = `${repoContext.owner}/${repoContext.repo}`;
        await exportChatMessages({
            title: `${contextLabel} Chat Export`,
            contextLabel,
            messages,
        });
        toast.success("Chat exported");
    };

    const handleRunQuickScanFromModal = (scanAiAssist: boolean) => {
        setShowSecurityModal(false);
        handleSubmitRef.current?.(undefined, QUICK_SCAN_PROMPT, "quick_scan", scanAiAssist);
    };

    const handleRunDeepScanFromModal = (scanAiAssist: boolean) => {
        setShowSecurityModal(false);
        if (!session) {
            setShowLoginModal(true);
            return;
        }
        handleSubmitRef.current?.(undefined, DEEP_SCAN_PROMPT, "deep_scan", scanAiAssist);
    };

    const repoLabel = `${repoContext.owner}/${repoContext.repo}`;
    const fileCount = repoContext.fileTree.filter((f) => f.type !== "tree").length;
    const showHero = messages.length === 1 && messages[0]?.id === "welcome" && !loading;
    const transcript = messages.filter((m) => m.id !== "welcome");
    const lastId = messages[messages.length - 1]?.id;
    const openFile = (path: string) => window.dispatchEvent(new CustomEvent("open-file-preview", { detail: path }));
    const heroSuggestions: HeroSuggestion[] = [
        { label: REPO_SUGGESTIONS[0], hint: "A diagram of how people move through the app", icon: <Workflow className="size-[1.1rem]" /> },
        { label: REPO_SUGGESTIONS[1], hint: "Structure, tests, risks and where to improve", icon: <Gauge className="size-[1.1rem]" /> },
        { label: REPO_SUGGESTIONS[2], hint: "Languages, frameworks and tooling in use", icon: <Layers className="size-[1.1rem]" /> },
        { label: REPO_SUGGESTIONS[3], hint: "Core modules, data flow and a diagram", icon: <Network className="size-[1.1rem]" /> },
    ];
    const openSecurity = () => {
        if (!session) {
            setShowLoginModal(true);
            return;
        }
        setShowSecurityModal(true);
    };

    return (
        <div className={cn("nv-workspace relative z-10 flex h-full min-h-0 flex-col text-nv-ivory-50", s.stage)} data-slot="chat">
            <WorkspaceToolbar
                lead={onToggleSidebar ? (
                    <button type="button" onClick={onToggleSidebar} aria-label="Open file explorer" className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-nv-sm px-2.5 text-nv-small font-medium text-nv-ivory-200 hover:bg-nv-graphite-850 md:hidden">
                        <Folder aria-hidden className="size-4" /> Files
                    </button>
                ) : undefined}
                segments={[
                    { id: "architecture", label: "Architecture", icon: <GitFork className="size-3.5" />, onClick: () => handleSubmit(undefined, ARCHITECTURE_PROMPT), disabled: loading || scanning, hint: "Explain the architecture with a diagram" },
                    { id: "security", label: "Security", icon: <Shield className="size-3.5" />, onClick: openSecurity, disabled: loading || scanning, hint: session ? "Scan for vulnerabilities" : "Sign in to run a security scan" },
                ]}
                meters={{
                    tokens: { used: formatTokenCount(totalTokens), max: formatTokenCount(MAX_TOKENS), fill: totalTokens / MAX_TOKENS, level: tokenWarningLevel },
                    quota: toolQuota ? { remaining: toolQuota.remaining, limit: toolQuota.limit, exhausted: isToolQuotaExhausted, onClick: () => setShowToolQuotaModal(true) } : undefined,
                }}
                onExport={handleExportChat}
                onClear={() => setShowClearConfirm(true)}
                extra={
                    <SearchModal
                        repoContext={repoContext}
                        onSendMessage={(role, content) => {
                            setMessages(prev => [...prev, { id: Date.now().toString(), role, content }]);
                        }}
                    />
                }
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
                            eyebrow="Repository workspace"
                            lead="Ask anything about"
                            accent={repoLabel}
                            facts={[`${fileCount.toLocaleString()} files indexed`, ownerProfile?.name ? `Owned by ${ownerProfile.name}` : `Owned by ${repoContext.owner}`]}
                            suggestions={heroSuggestions}
                            onPick={handleSuggestionClick}
                        />
                    ) : (
                        <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-10 px-4 pb-12 pt-8 sm:px-6">
                            {transcript.map((msg) => {
                                const isLatestMessage = msg.id === lastId;
                                const isStreamingScanPlaceholder = msg.role === "model" && Boolean(msg.scanStatus) && loading && scanning && isLatestMessage;
                                const isActiveModelStreamState =
                                    msg.role === "model" && loading && isLatestMessage && (Boolean(msg.scanStatus) || Boolean(msg.streamStatus) || msg.modelUsed === "thinking");
                                if (msg.role === "model" && !msg.content && !msg.failure && !isActiveModelStreamState) return null;
                                const streaming = loading && isLatestMessage && msg.role === "model" && !msg.scanStatus;

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
                                            streaming={streaming}
                                            currentOwner={repoContext.owner}
                                            currentRepo={repoContext.repo}
                                            fileTree={repoContext.fileTree}
                                            onCopy={handleCopyMessage}
                                            copied={copiedMessageId === msg.id}
                                            onRetry={handleRetry}
                                            onOpenFile={(path) => {
                                                if (repoContext.fileTree.find((f) => f.path === path)?.type === "tree") {
                                                    window.dispatchEvent(new CustomEvent("reveal-folder", { detail: path }));
                                                } else {
                                                    openFile(path);
                                                }
                                            }}
                                        >
                                            {isStreamingScanPlaceholder && (
                                                <div role="status" className="flex items-center gap-3 py-1 text-nv-small font-medium text-nv-ivory-200">
                                                    <span aria-hidden className="inline-block size-5 rounded-full border-2 border-nv-copper-700 border-t-nv-copper-400 nv-spin" />
                                                    <span>{msg.scanStatus === "deep_running" ? "Deep scan running" : "Quick scan running"}</span>
                                                </div>
                                            )}
                                            {msg.scanId && (
                                                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-nv-graphite-700 pt-4">
                                                    <Link
                                                        href={`/report/${msg.scanId}`}
                                                        target="_blank"
                                                        className="inline-flex min-h-11 items-center gap-2 rounded-nv-sm bg-nv-copper-500 px-4 text-nv-small font-medium text-white shadow-nv-accent transition-colors hover:bg-nv-copper-300"
                                                    >
                                                        <Shield aria-hidden className="size-4" />
                                                        View full report
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const link = await createScanShareLink(msg.scanId!);
                                                                await navigator.clipboard.writeText(link.url);
                                                                toast.success("Signed report link copied!", {
                                                                    description: `Expires on ${new Date(link.expiresAt).toLocaleDateString()}`,
                                                                });
                                                            } catch (error) {
                                                                const message = error instanceof Error ? error.message : "Failed to share report";
                                                                toast.error("Failed to share report", { description: message });
                                                            }
                                                        }}
                                                        className="inline-flex min-h-11 items-center gap-2 rounded-nv-sm border border-nv-graphite-600 bg-white px-4 text-nv-small font-medium text-nv-ivory-100 transition-colors hover:border-nv-graphite-500"
                                                    >
                                                        <CopySquaresIcon className="size-4" />
                                                        Share report
                                                    </button>
                                                </div>
                                            )}
                                            {msg.isQuickSecurityScan && (
                                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-nv-lg border border-nv-graphite-700 bg-white/70 p-4">
                                                    <p className="m-0 text-nv-small text-nv-ivory-200">Want a more thorough analysis?</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSubmit(undefined, DEEP_SCAN_PROMPT, "deep_scan")}
                                                        disabled={loading || scanning}
                                                        className="inline-flex min-h-11 items-center gap-2 rounded-nv-sm border border-nv-graphite-600 bg-white px-4 text-nv-small font-medium text-nv-ivory-50 transition-colors hover:border-nv-danger-edge hover:text-nv-danger disabled:opacity-50"
                                                    >
                                                        <Shield aria-hidden className="size-4" />
                                                        Run deep scan
                                                    </button>
                                                </div>
                                            )}
                                        </ChatMessage>
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

                    <form id="chat-form" onSubmit={handleSubmit} className="relative">
                        <ChatInput
                            focusSignal={focusSignal}
                            quotaNode={undefined}
                            value={input}
                            onChange={setInput}
                            onSubmit={handleSubmit}
                            placeholder={
                                totalTokens >= MAX_TOKENS
                                    ? "Conversation limit reached. Please clear chat."
                                    : isToolQuotaExhausted
                                        ? "Tool calls are paused. You can still ask in no-tool mode."
                                        : `Ask anything about ${repoContext.repo} (use @ or drop to tag)...`
                            }
                            disabled={totalTokens >= MAX_TOKENS}
                            disabledReason={totalTokens >= MAX_TOKENS ? "This conversation is at its length limit. Clear the chat to start a new one." : undefined}
                            loading={loading}
                            allowEmptySubmit={Boolean(referenceText) || taggedFiles.length > 0}
                            repositoryFiles={repoContext.fileTree.map(f => ({ path: f.path, type: f.type || "blob" }))}
                            taggedFiles={taggedFiles}
                            onTaggedFilesChange={setTaggedFiles}
                            modelPreference={modelPreference}
                            setModelPreference={setModelPreference}
                            onRequireAuth={() => {
                                setLoginModalCopy({
                                    title: "Login Required For Thinking Mode",
                                    description: "Sign in to use Thinking Mode and higher repo-tool limits.",
                                });
                                setShowLoginModal(true);
                            }}
                        />
                    </form>
                    <p className="m-0 text-center text-nv-micro text-nv-ivory-300">Answers come from the repository files and GitHub data. Check the cited files before relying on them.</p>
                </div>
            </div>

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

            <BadgeModal
                isOpen={showBadgeModal}
                owner={repoContext.owner}
                repo={repoContext.repo}
                onClose={() => setShowBadgeModal(false)}
            />

            <SecurityScanModal
                isOpen={showSecurityModal}
                isAuthenticated={Boolean(session)}
                deepScansData={deepScansData}
                latestScanId={latestScanId}
                onClose={() => setShowSecurityModal(false)}
                onRunQuickScan={handleRunQuickScanFromModal}
                onRunDeepScan={handleRunDeepScanFromModal}
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
                    scope="repo"
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
