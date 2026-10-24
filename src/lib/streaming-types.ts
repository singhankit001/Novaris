/**
 * Type definitions for streaming server action responses
 */

import type { ChatMessageBase } from "@/lib/chat-types";

export type StreamUpdate =
    | { type: "status"; message: string; progress: number; code?: string }
    | { type: "tool"; name: string; detail?: string; usageUnits?: number; billable?: boolean }
    | { type: "thought"; text: string }
    | { type: "content"; text: string; append: boolean }
    | { type: "files"; files: string[] }
    | {
        type: "complete";
        relevantFiles: string[];
        metadata?: {
            commitFreshnessLabel?: string;
            toolsUsed?: string[];
            processingSummary?: string[];
            sourceScope?: string;
        };
    }
    | { type: "error"; message: string; code?: string };

export type StreamingMessage = ChatMessageBase;

export interface StreamingState {
    status: string;
    progress: number;
    isStreaming: boolean;
}

/**
 * Stable error codes a client can branch on. Messages are fixed, user-safe strings; raw upstream
 * text never leaves the server (it is logged there). See docs/STREAM-PROTOCOL.md.
 */
export const STREAM_ERROR_MESSAGES = {
    AI_UNAVAILABLE: "The AI service is unavailable right now. Please try again shortly.",
    AI_TIMEOUT: "The AI service took too long to respond. Please try again.",
    AI_FUNCTION_TURN_ORDER: "AI tool handoff failed during streaming. Please retry.",
    AI_MISSING_THOUGHT_SIGNATURE: "AI tool handoff failed during streaming. Please retry.",
    GITHUB_RATE_LIMITED: "GitHub rate limit reached. Wait a few minutes or sign in, then retry.",
    GITHUB_NOT_FOUND: "That repository or profile was not found, or it is private.",
    GITHUB_AUTH_EXPIRED: "Your GitHub access has expired. Sign in again to continue.",
    REPO_TOO_LARGE: "This repository is too large to analyze in one request. Narrow the question or the files.",
    STORAGE_UNAVAILABLE: "Storage is temporarily unavailable. Please try again shortly.",
    STREAM_TRUNCATED: "The response ended before it was complete. The partial answer was kept.",
    RUN_IN_PROGRESS: "This request is already being processed.",
    INTERNAL: "Something went wrong on our side. Please try again.",
} as const;

export type StreamErrorCode = keyof typeof STREAM_ERROR_MESSAGES;

export interface SafeStreamError {
    code: StreamErrorCode;
    message: string;
}

function isStreamErrorCode(value: unknown): value is StreamErrorCode {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(STREAM_ERROR_MESSAGES, value);
}

// Order matters: GitHub-specific patterns must win over generic 429/quota AI patterns.
const ERROR_PATTERNS: Array<[RegExp, StreamErrorCode]> = [
    [/thought_signature/i, "AI_MISSING_THOUGHT_SIGNATURE"],
    [/function response turn comes immediately after a function call turn/i, "AI_FUNCTION_TURN_ORDER"],
    [/github.*rate limit|api rate limit|secondary rate limit|abuse detection/i, "GITHUB_RATE_LIMITED"],
    [/bad credentials|token (has )?(expired|revoked)|requires authentication|\b401\b/i, "GITHUB_AUTH_EXPIRED"],
    [/repo(sitory)? (is )?too large|too many files|tree.*truncated|payload too large/i, "REPO_TOO_LARGE"],
    [/not found|\b404\b|\b451\b|repository access blocked/i, "GITHUB_NOT_FOUND"],
    [/timed? ?out|etimedout|deadline exceeded|aborted due to timeout/i, "AI_TIMEOUT"],
    [/prisma|database|\bP\d{4}\b|\bkv\b|redis/i, "STORAGE_UNAVAILABLE"],
    [/gemini|googlegenerativeai|generativelanguage|api key|\b429\b|\b50[023]\b|overloaded|quota|fetch failed|resource.?exhausted/i, "AI_UNAVAILABLE"],
];

/**
 * Map any thrown value or upstream error chunk to a stable, user-safe error. A known `code`
 * wins; otherwise the raw message is classified. Callers must log the raw text themselves.
 */
export function toSafeStreamError(rawMessage: unknown, rawCode?: unknown): SafeStreamError {
    if (isStreamErrorCode(rawCode)) {
        return { code: rawCode, message: STREAM_ERROR_MESSAGES[rawCode] };
    }
    const text = typeof rawMessage === "string" ? rawMessage : rawMessage instanceof Error ? rawMessage.message : "";
    for (const [pattern, code] of ERROR_PATTERNS) {
        if (pattern.test(text)) return { code, message: STREAM_ERROR_MESSAGES[code] };
    }
    return { code: "INTERNAL", message: STREAM_ERROR_MESSAGES.INTERNAL };
}
