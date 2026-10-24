import { describe, expect, it } from "vitest";
import { analysisReducer, classifyFailure, initialAnalysisState, type AnalysisState } from "./analysis-machine";

function run(events: Parameters<typeof analysisReducer>[1][], from: AnalysisState = initialAnalysisState) {
    return events.reduce(analysisReducer, from);
}

describe("analysisReducer", () => {
    it("walks idle to complete", () => {
        const s = run([
            { type: "SUBMIT", requestId: 1 },
            { type: "VALID", requestId: 1, label: "Selecting files" },
            { type: "STREAM_OPEN", requestId: 1 },
            { type: "TOOL", requestId: 1, name: "readFile", label: "Calling readFile" },
            { type: "COMPLETE", requestId: 1 },
        ]);
        expect(s).toEqual({ phase: "complete", requestId: 1 });
    });

    it("ignores events from a superseded request", () => {
        const s = run([
            { type: "SUBMIT", requestId: 1 },
            { type: "VALID", requestId: 1, label: "a" },
            { type: "SUBMIT", requestId: 2 },
            { type: "FAIL", requestId: 1, failure: { code: "INTERNAL", message: "x", retryable: true } },
        ]);
        expect(s).toEqual({ phase: "validating", requestId: 2 });
    });

    it("records tools disabled and keeps unique tools", () => {
        const s = run([
            { type: "SUBMIT", requestId: 1 },
            { type: "VALID", requestId: 1, label: "a" },
            { type: "STREAM_OPEN", requestId: 1 },
            { type: "TOOLS_DISABLED", requestId: 1 },
            { type: "TOOL", requestId: 1, name: "t", label: "t" },
            { type: "TOOL", requestId: 1, name: "t", label: "t" },
        ]);
        expect(s).toMatchObject({ phase: "streaming", toolsDisabled: true, tools: ["t"] });
    });

    it("cannot complete a failed request", () => {
        const failed = run([
            { type: "SUBMIT", requestId: 1 },
            { type: "VALID", requestId: 1, label: "a" },
            { type: "FAIL", requestId: 1, failure: { code: "AI_TIMEOUT", message: "m", retryable: true } },
            { type: "COMPLETE", requestId: 1 },
        ]);
        expect(failed.phase).toBe("failed");
    });
});

describe("classifyFailure", () => {
    it("maps 429 with retry-after", () => {
        const c = classifyFailure({ status: 429, code: "RATE_LIMITED", message: "slow", retryAfterSeconds: 12 });
        expect(c).toMatchObject({ kind: "rate-limited", rate: "request", failure: { retryAfterSeconds: 12 } });
    });
    it("maps auth codes and statuses to unauthorized", () => {
        expect(classifyFailure({ status: 401, code: "LOGIN_REQUIRED_THINKING_MODE" })).toMatchObject({ kind: "unauthorized", reason: "thinking" });
        expect(classifyFailure({ code: "GITHUB_AUTH_EXPIRED" })).toMatchObject({ kind: "unauthorized", reason: "github" });
        expect(classifyFailure({ status: 403 })).toMatchObject({ kind: "unauthorized", reason: "session" });
    });
    it("treats limiter outage and stream truncation as retryable failures", () => {
        expect(classifyFailure({ status: 503, code: "LIMITER_UNAVAILABLE" })).toMatchObject({ kind: "failed", failure: { retryable: true } });
        expect(classifyFailure({ code: "STREAM_TRUNCATED" })).toMatchObject({ kind: "failed", failure: { retryable: true } });
    });
    it("does not offer retry for oversized repositories", () => {
        expect(classifyFailure({ code: "REPO_TOO_LARGE" })).toMatchObject({ kind: "failed", failure: { retryable: false } });
    });
});
