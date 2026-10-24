import type { MessageFailure } from "@/lib/chat-types";
import { STREAM_ERROR_MESSAGES } from "@/lib/streaming-types";

/**
 * One analysis request, as a state machine:
 * idle -> validating -> acquiring -> streaming -> complete | failed | rate-limited | unauthorized.
 *
 * Every transition after SUBMIT carries the requestId it belongs to. A reducer that sees an event
 * for an older request ignores it, so a slow response can never overwrite a newer question.
 */

export type UnauthorizedReason = "session" | "thinking" | "cross-repo" | "deep-scan" | "github";
export type RateLimitKind = "request" | "tool-quota" | "github";

export type AnalysisState =
    | { phase: "idle" }
    | { phase: "validating"; requestId: number }
    | { phase: "acquiring"; requestId: number; label: string }
    | { phase: "streaming"; requestId: number; label: string; tools: string[]; toolsDisabled: boolean }
    | { phase: "complete"; requestId: number }
    | { phase: "failed"; requestId: number; failure: MessageFailure }
    | { phase: "rate-limited"; requestId: number; kind: RateLimitKind; message: string; retryAfterSeconds?: number }
    | { phase: "unauthorized"; requestId: number; reason: UnauthorizedReason; message: string };

export type AnalysisPhase = AnalysisState["phase"];

export type AnalysisEvent =
    | { type: "SUBMIT"; requestId: number }
    | { type: "VALID"; requestId: number; label: string }
    | { type: "STREAM_OPEN"; requestId: number }
    | { type: "STATUS"; requestId: number; label: string }
    | { type: "TOOL"; requestId: number; name: string; label: string }
    | { type: "TOOLS_DISABLED"; requestId: number }
    | { type: "COMPLETE"; requestId: number }
    | { type: "FAIL"; requestId: number; failure: MessageFailure }
    | { type: "RATE_LIMITED"; requestId: number; kind: RateLimitKind; message: string; retryAfterSeconds?: number }
    | { type: "UNAUTHORIZED"; requestId: number; reason: UnauthorizedReason; message: string }
    | { type: "RESET" };

export const initialAnalysisState: AnalysisState = { phase: "idle" };

export function isBusy(state: AnalysisState): boolean {
    return state.phase === "validating" || state.phase === "acquiring" || state.phase === "streaming";
}

function currentRequestId(state: AnalysisState): number | null {
    return state.phase === "idle" ? null : state.requestId;
}

export function analysisReducer(state: AnalysisState, event: AnalysisEvent): AnalysisState {
    if (event.type === "RESET") return initialAnalysisState;
    if (event.type === "SUBMIT") {
        // A new request always wins, whatever the old one was doing.
        return { phase: "validating", requestId: event.requestId };
    }
    if (currentRequestId(state) !== event.requestId) return state;

    switch (event.type) {
        case "VALID":
            return state.phase === "validating" ? { phase: "acquiring", requestId: event.requestId, label: event.label } : state;
        case "STREAM_OPEN":
            return state.phase === "acquiring"
                ? { phase: "streaming", requestId: event.requestId, label: state.label, tools: [], toolsDisabled: false }
                : state;
        case "STATUS":
            if (state.phase === "streaming") return { ...state, label: event.label };
            if (state.phase === "acquiring") return { ...state, label: event.label };
            return state;
        case "TOOL":
            if (state.phase !== "streaming") return state;
            return {
                ...state,
                label: event.label,
                tools: state.tools.includes(event.name) ? state.tools : [...state.tools, event.name],
            };
        case "TOOLS_DISABLED":
            return state.phase === "streaming" ? { ...state, toolsDisabled: true } : state;
        case "COMPLETE":
            return state.phase === "streaming" ? { phase: "complete", requestId: event.requestId } : state;
        case "FAIL":
            return isBusy(state) ? { phase: "failed", requestId: event.requestId, failure: event.failure } : state;
        case "RATE_LIMITED":
            return isBusy(state)
                ? {
                      phase: "rate-limited",
                      requestId: event.requestId,
                      kind: event.kind,
                      message: event.message,
                      retryAfterSeconds: event.retryAfterSeconds,
                  }
                : state;
        case "UNAUTHORIZED":
            return isBusy(state)
                ? { phase: "unauthorized", requestId: event.requestId, reason: event.reason, message: event.message }
                : state;
        default:
            return state;
    }
}

/** What the failure UI and the reducer need to know about one failed request. */
export type ClassifiedFailure =
    | { kind: "failed"; failure: MessageFailure }
    | { kind: "rate-limited"; rate: RateLimitKind; failure: MessageFailure }
    | { kind: "unauthorized"; reason: UnauthorizedReason; failure: MessageFailure };

export interface FailureInput {
    status?: number;
    code?: string;
    message?: string;
    retryAfterSeconds?: number;
}

function knownMessage(code: string | undefined): string | undefined {
    return code && code in STREAM_ERROR_MESSAGES ? STREAM_ERROR_MESSAGES[code as keyof typeof STREAM_ERROR_MESSAGES] : undefined;
}

const UNAUTHORIZED_CODES: Record<string, UnauthorizedReason> = {
    LOGIN_REQUIRED_THINKING_MODE: "thinking",
    LOGIN_REQUIRED_CROSS_REPO: "cross-repo",
    GITHUB_AUTH_EXPIRED: "github",
    SESSION_INVALID: "session",
    INVALID_SESSION: "session",
};

/** 400 validation codes: the request itself is wrong, so retrying the same text cannot help. */
const NON_RETRYABLE_CODES = new Set([
    "INVALID_JSON", "BODY_INVALID", "QUERY_REQUIRED", "QUERY_TOO_LONG", "HISTORY_INVALID", "HISTORY_TOO_LONG",
    "HISTORY_TURN_TOO_LONG", "FILE_PATHS_INVALID", "FILE_PATHS_TOO_MANY", "FILE_SHAS_INVALID", "FILE_SHAS_TOO_MANY",
    "REPO_INVALID", "USERNAME_INVALID", "RUN_ID_INVALID", "RUN_ALREADY_COMPLETED", "PAYLOAD_TOO_LARGE",
]);

/**
 * Maps an HTTP status, a stable error code or a stream `error` chunk to one UI state.
 * Codes win over statuses; unknown input falls back to a generic retryable failure.
 */
export function classifyFailure(input: FailureInput): ClassifiedFailure {
    const { status, code } = input;
    const text = (input.message ?? "").trim();
    const message = text || knownMessage(code) || "The analysis could not be completed.";

    if (status === 429 || code === "RATE_LIMITED") {
        return {
            kind: "rate-limited",
            rate: "request",
            failure: { code: "RATE_LIMITED", message, retryable: true, retryAfterSeconds: input.retryAfterSeconds },
        };
    }
    if (code === "GITHUB_RATE_LIMITED") {
        return { kind: "rate-limited", rate: "github", failure: { code, message, retryable: true } };
    }
    if (code === "ANON_USAGE_LIMIT_EXCEEDED" || code === "AUTH_USAGE_LIMIT_EXCEEDED") {
        return { kind: "rate-limited", rate: "tool-quota", failure: { code, message, retryable: false } };
    }
    const reason = code ? UNAUTHORIZED_CODES[code] : undefined;
    if (reason) {
        return { kind: "unauthorized", reason, failure: { code: code as string, message, retryable: false } };
    }
    if (status === 401 || status === 403) {
        return { kind: "unauthorized", reason: "session", failure: { code: code ?? "UNAUTHORIZED", message, retryable: false } };
    }
    if (code && NON_RETRYABLE_CODES.has(code)) {
        const hint = code === "QUERY_TOO_LONG" ? "Shorten the question (4000 characters at most)." : code === "HISTORY_TOO_LONG" || code === "HISTORY_TURN_TOO_LONG" ? "This conversation is too long to send. Clear the chat and ask again." : code === "PAYLOAD_TOO_LARGE" ? "This request is too large. Ask about a specific folder or feature." : message;
        return { kind: "failed", failure: { code, message: hint, retryable: false } };
    }
    if (status === 413 || code === "REPO_TOO_LARGE") {
        return { kind: "failed", failure: { code: code ?? "REPO_TOO_LARGE", message: knownMessage("REPO_TOO_LARGE") ?? message, retryable: false } };
    }
    if (code === "GITHUB_NOT_FOUND") {
        return { kind: "failed", failure: { code, message, retryable: false } };
    }
    // LIMITER_UNAVAILABLE, STORAGE_UNAVAILABLE, AI_*, STREAM_TRUNCATED, INTERNAL and anything unknown: retry may work.
    return { kind: "failed", failure: { code: code ?? "INTERNAL", message, retryable: true } };
}

export function eventForClassified(requestId: number, c: ClassifiedFailure): AnalysisEvent {
    if (c.kind === "rate-limited") {
        return { type: "RATE_LIMITED", requestId, kind: c.rate, message: c.failure.message, retryAfterSeconds: c.failure.retryAfterSeconds };
    }
    if (c.kind === "unauthorized") {
        return { type: "UNAUTHORIZED", requestId, reason: c.reason, message: c.failure.message };
    }
    return { type: "FAIL", requestId, failure: c.failure };
}

/** Phase label shown under the progress bar. Never a percentage. */
export function phaseLabel(state: AnalysisState): string | null {
    if (state.phase === "validating") return "Checking your question";
    if (state.phase === "acquiring" || state.phase === "streaming") return state.label;
    return null;
}
