import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    authMock,
    processProfileQueryStreamMock,
    trackAuthenticatedQueryEventMock,
    trackEventMock,
    reserveToolBudgetMock,
    settleMock,
    acquireRunLockMock,
    enforceRateLimitMock,
    getAnonymousActorIdMock,
    chatRunUpdateMock,
} = vi.hoisted(() => ({
    chatRunUpdateMock: vi.fn(),
    authMock: vi.fn(),
    processProfileQueryStreamMock: vi.fn(),
    trackAuthenticatedQueryEventMock: vi.fn(),
    trackEventMock: vi.fn(),
    reserveToolBudgetMock: vi.fn(),
    settleMock: vi.fn(),
    acquireRunLockMock: vi.fn(),
    enforceRateLimitMock: vi.fn(),
    getAnonymousActorIdMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
}));

vi.mock("@/app/actions", () => ({
    processProfileQueryStream: processProfileQueryStreamMock,
}));

vi.mock("@/lib/analytics", () => ({
    trackAuthenticatedQueryEvent: trackAuthenticatedQueryEventMock,
    trackEvent: trackEventMock,
}));

vi.mock("@/lib/cache", () => ({
    reserveToolBudget: reserveToolBudgetMock,
    acquireRunLock: acquireRunLockMock,
    releaseRunLock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
    RATE_LIMIT_CHAT: {},
    enforceRateLimit: enforceRateLimitMock,
}));

process.env.GEMINI_API_KEY = "test-key";

vi.mock("@/lib/actor-id", () => ({
    ANON_COOKIE_NAME: "rm_anon_id",
    getAnonymousCookieIdFromActorId: vi.fn(),
    getAnonymousActorId: getAnonymousActorIdMock,
    getAnonymousNetworkId: vi.fn().mockReturnValue("ip_net"),
    isValidAnonymousCookieId: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/db", () => ({
    prisma: {
        chatRun: {
            findFirst: vi.fn(async () => ({ id: "run_1", status: "RUNNING" })),
            update: chatRunUpdateMock,
        },
    },
}));

import { POST } from "@/app/api/chat/profile/route";

function authedRequest(runId = "run_1") {
    return new NextRequest("http://localhost/api/chat/profile", {
        method: "POST",
        body: JSON.stringify({ query: "Summarize profile", profileContext: { username: "octocat" }, modelPreference: "flash", runId }),
        headers: { "content-type": "application/json" },
    });
}

describe("POST /api/chat/profile", () => {
    beforeEach(() => {
        authMock.mockReset();
        processProfileQueryStreamMock.mockReset();
        trackAuthenticatedQueryEventMock.mockReset();
        trackEventMock.mockReset();
        reserveToolBudgetMock.mockReset();
        settleMock.mockReset();
        getAnonymousActorIdMock.mockReset();

        settleMock.mockResolvedValue(undefined);
        reserveToolBudgetMock.mockResolvedValue({ status: "granted", reserved: 3, settle: settleMock });
        getAnonymousActorIdMock.mockReturnValue("anon_actor");
        acquireRunLockMock.mockReset();
        acquireRunLockMock.mockResolvedValue(true);
        enforceRateLimitMock.mockReset();
        enforceRateLimitMock.mockResolvedValue(null);
        process.env.GEMINI_API_KEY = "test-key";
        chatRunUpdateMock.mockReset();
        chatRunUpdateMock.mockResolvedValue({});
    });

    it("marks the run FAILED with its partial answer and does not charge when the generator reports an error", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "tool", name: "fetch_recent_commits", usageUnits: 2 };
            yield { type: "content", text: "partial answer" };
            yield { type: "error", message: "Gemini timed out", code: "AI_TIMEOUT" };
        });

        const response = await POST(authedRequest());
        const body = await response.text();

        expect(body).toContain('"type":"error"');
        expect(body).toContain('"code":"AI_TIMEOUT"');
        expect(body).not.toContain("Gemini timed out");
        expect(chatRunUpdateMock).toHaveBeenLastCalledWith({
            where: { id: "run_1" },
            data: { partialText: "partial answer", status: "FAILED", errorMessage: "AI_TIMEOUT: The AI service took too long to respond. Please try again." },
        });
        expect(settleMock).toHaveBeenCalledWith(2, false);
        expect(settleMock).not.toHaveBeenCalledWith(expect.anything(), true);
    });

    it("marks a stream that ends without completing as FAILED instead of leaving it RUNNING", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "content", text: "cut off" };
        });

        const response = await POST(authedRequest());
        await response.text();

        expect(chatRunUpdateMock).toHaveBeenLastCalledWith({
            where: { id: "run_1" },
            data: { partialText: "cut off", status: "FAILED", errorMessage: "STREAM_TRUNCATED: The response ended before it was complete. The partial answer was kept." },
        });
        expect(settleMock).not.toHaveBeenCalledWith(expect.anything(), true);
    });

    it("completes the run and charges tools once on success", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "tool", name: "fetch_recent_commits", usageUnits: 2 };
            yield { type: "content", text: "done" };
            yield { type: "complete", relevantFiles: [] };
        });

        const response = await POST(authedRequest());
        await response.text();

        expect(chatRunUpdateMock).toHaveBeenLastCalledWith({
            where: { id: "run_1" },
            data: { partialText: "done", finalText: "done", status: "COMPLETED" },
        });
        expect(settleMock).toHaveBeenCalledTimes(1);
        expect(settleMock).toHaveBeenCalledWith(2, true);
    });

    it("allows unauthenticated users in flash mode", async () => {
        authMock.mockResolvedValue(null);
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "content", text: "hello", append: true };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: { username: "octocat" },
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0",
            },
        });

        const response = await POST(request);
        await response.text();

        expect(response.status).toBe(200);
        expect(processProfileQueryStreamMock).toHaveBeenCalledWith(
            "Summarize profile",
            { username: "octocat" },
            "flash",
            expect.objectContaining({
                cacheAudience: "anonymous",
                cacheActorId: "anon_actor",
                crossRepoEnabled: false,
                history: [],
            })
        );
        expect(reserveToolBudgetMock).toHaveBeenCalledWith("profile", "anonymous", ["anon_actor", "ip_net"]);
        expect(trackAuthenticatedQueryEventMock).not.toHaveBeenCalled();
        // Anonymous visitors should be tracked via trackEvent with the anon actorId
        expect(trackEventMock).toHaveBeenCalledWith("anon_actor", "query", expect.objectContaining({ device: "desktop" }));
    });

    it("tracks anonymous visitors via trackEvent with anon_ actorId", async () => {
        authMock.mockResolvedValue(null);
        getAnonymousActorIdMock.mockReturnValue("anon_xyz789");
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: { username: "octocat" },
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
                "user-agent": "Dalvik/2.1.0 (Linux; Android 14)",
                "x-vercel-ip-country": "DE",
            },
        });

        const response = await POST(request);
        await response.text();

        expect(response.status).toBe(200);
        expect(trackAuthenticatedQueryEventMock).not.toHaveBeenCalled();
        expect(trackEventMock).toHaveBeenCalledWith("anon_xyz789", "query", {
            country: "DE",
            device: "desktop",
            userAgent: "Dalvik/2.1.0 (Linux; Android 14)",
        });
    });

    it("returns INVALID_SESSION when user exists without id", async () => {
        authMock.mockResolvedValue({
            user: { name: "User", email: "user@example.com" },
        });

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: { username: "octocat" },
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
            },
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toEqual({
            error: "Unauthorized",
            code: "INVALID_SESSION",
        });
        expect(processProfileQueryStreamMock).not.toHaveBeenCalled();
        expect(trackAuthenticatedQueryEventMock).not.toHaveBeenCalled();
        expect(trackEventMock).not.toHaveBeenCalled();
    });

    it("returns login-required code for anonymous thinking mode", async () => {
        authMock.mockResolvedValue(null);

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Deep profile analysis",
                profileContext: { username: "octocat" },
                modelPreference: "thinking",
            }),
            headers: {
                "content-type": "application/json",
            },
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toEqual({
            error: "Login required for Thinking mode.",
            code: "LOGIN_REQUIRED_THINKING_MODE",
        });
        expect(processProfileQueryStreamMock).not.toHaveBeenCalled();
    });

    it("continues streaming with tool calls disabled when budget is exhausted", async () => {
        authMock.mockResolvedValue(null);
        reserveToolBudgetMock.mockResolvedValueOnce({ status: "exhausted" });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "status", message: "Tool calls are paused for this window.", progress: 50 };
            yield { type: "content", text: "fallback answer", append: true };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: { username: "octocat" },
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
            },
        });

        const response = await POST(request);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(processProfileQueryStreamMock).toHaveBeenCalled();
        expect(processProfileQueryStreamMock.mock.calls[0]?.[3]).toMatchObject({ disableToolCalls: true });
        expect(text).toContain("fallback answer");
        expect(settleMock).not.toHaveBeenCalledWith(expect.anything(), true);
    });

    it("tracks analytics for authenticated users via trackAuthenticatedQueryEvent only", async () => {
        authMock.mockResolvedValue({
            user: { id: "user_123", email: "user@example.com" },
        });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "content", text: "hello" };
            yield { type: "tool", name: "fetch_recent_commits", usageUnits: 2 };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: { username: "octocat" },
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0 (iPhone; Mobile)",
                "x-vercel-ip-country": "IN",
            },
        });

        const response = await POST(request);
        await response.text();

        expect(response.status).toBe(200);
        // Auth user tracked via trackAuthenticatedQueryEvent, NOT trackEvent
        expect(trackAuthenticatedQueryEventMock).toHaveBeenCalledWith("user_123", {
            anonId: undefined,
            country: "IN",
            device: "mobile",
            userAgent: "Mozilla/5.0 (iPhone; Mobile)",
        });
        expect(trackEventMock).not.toHaveBeenCalled();
        expect(settleMock).toHaveBeenCalledWith(2, true);
    });

    it("does not bill native web-search tool units", async () => {
        authMock.mockResolvedValue({
            user: { id: "user_123", email: "user@example.com" },
        });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "tool", name: "googleSearch", usageUnits: 4 };
            yield { type: "content", text: "hello" };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: { username: "octocat" },
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0",
            },
        });

        const response = await POST(request);
        await response.text();

        expect(response.status).toBe(200);
        // Nothing billable was used: the whole reservation is refunded.
        expect(settleMock).toHaveBeenCalledWith(0, true);
    });

    it("bills only one unit when a non-billable tool-intent event is followed by a billable completion event", async () => {
        authMock.mockResolvedValue({
            user: { id: "user_123", email: "user@example.com" },
        });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "tool", name: "fetch_recent_commits", usageUnits: 1, billable: false };
            yield { type: "tool", name: "fetch_recent_commits", usageUnits: 1, billable: true };
            yield { type: "content", text: "hello" };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: { username: "octocat" },
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0",
            },
        });

        const response = await POST(request);
        await response.text();

        expect(response.status).toBe(200);
        expect(settleMock).toHaveBeenCalledWith(1, true);
    });

    function jsonRequest(payload: unknown, runId?: string) {
        return new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify(typeof payload === "object" && payload !== null && !Array.isArray(payload) ? { runId, ...payload } : payload),
            headers: { "content-type": "application/json" },
        });
    }
    const valid = { query: "Summarize profile", profileContext: { username: "octocat" }, modelPreference: "flash" };

    it("never leaks raw upstream text and maps it to a stable error code", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "error", message: "403 API rate limit exceeded for token ghp_SECRET" };
        });
        const text = await (await POST(authedRequest())).text();
        expect(text).toContain('"code":"GITHUB_RATE_LIMITED"');
        expect(text).not.toContain("ghp_SECRET");
    });

    it("emits a STREAM_TRUNCATED error chunk when the generator ends without a terminal chunk", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "content", text: "cut" };
        });
        const text = await (await POST(authedRequest())).text();
        expect(text).toContain('"code":"STREAM_TRUNCATED"');
    });

    it("drops chunks after the first terminal chunk so completion is delivered once", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "content", text: "a" };
            yield { type: "complete", relevantFiles: [] };
            yield { type: "complete", relevantFiles: [] };
            yield { type: "content", text: "late" };
        });
        const text = await (await POST(authedRequest())).text();
        expect(text.match(/"type":"complete"/g)).toHaveLength(1);
        expect(text).not.toContain("late");
        expect(chatRunUpdateMock.mock.calls.filter(([arg]) => arg.data.status === "COMPLETED")).toHaveLength(1);
    });

    it("attempts FAILED, ends with STORAGE_UNAVAILABLE and refunds when the completion write fails", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "tool", name: "fetch_recent_commits", usageUnits: 1 };
            yield { type: "content", text: "done" };
            yield { type: "complete", relevantFiles: [] };
        });
        chatRunUpdateMock.mockImplementation(async ({ data }: { data: { status: string } }) => {
            if (data.status === "COMPLETED") throw new Error("db down");
            return {};
        });
        const text = await (await POST(authedRequest())).text();
        expect(text).toContain('"code":"STORAGE_UNAVAILABLE"');
        expect(text).not.toContain('"type":"complete"');
        expect(chatRunUpdateMock.mock.calls.some(([arg]) => arg.data.status === "FAILED")).toBe(true);
        expect(settleMock).toHaveBeenCalledWith(1, false);
    });

    it("returns 503 AI_UNAVAILABLE, fails the run and reserves no budget when GEMINI_API_KEY is unset", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        delete process.env.GEMINI_API_KEY;
        const response = await POST(authedRequest());
        expect(response.status).toBe(503);
        expect((await response.json()).code).toBe("AI_UNAVAILABLE");
        expect(processProfileQueryStreamMock).not.toHaveBeenCalled();
        expect(reserveToolBudgetMock).not.toHaveBeenCalled();
        expect(chatRunUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) })
        );
    });

    it("fails closed on budget storage errors: tools disabled, status chunk explains, still answers", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        reserveToolBudgetMock.mockResolvedValueOnce({ status: "unavailable" });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "content", text: "answer" };
            yield { type: "complete", relevantFiles: [] };
        });
        const text = await (await POST(authedRequest())).text();
        expect(processProfileQueryStreamMock.mock.calls[0]?.[3]).toMatchObject({ disableToolCalls: true });
        expect(text).toContain('"code":"TOOLS_UNAVAILABLE"');
        expect(text).toContain("answer");
    });

    it("rejects a duplicate in-flight POST for the same run", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        acquireRunLockMock.mockResolvedValueOnce(false);
        const response = await POST(authedRequest());
        expect(response.status).toBe(409);
        expect((await response.json()).code).toBe("RUN_IN_PROGRESS");
        expect(processProfileQueryStreamMock).not.toHaveBeenCalled();
    });

    it("passes through the limiter response before reading the body", async () => {
        authMock.mockResolvedValue(null);
        enforceRateLimitMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ code: "RATE_LIMITED" }), { status: 429, headers: { "Retry-After": "7" } })
        );
        const response = await POST(jsonRequest(valid));
        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("7");
        expect(processProfileQueryStreamMock).not.toHaveBeenCalled();
    });

    it("blocks cross-repo analysis for anonymous callers server-side", async () => {
        authMock.mockResolvedValue(null);
        const response = await POST(jsonRequest({ ...valid, crossRepoEnabled: true }));
        expect(response.status).toBe(401);
        expect((await response.json()).code).toBe("LOGIN_REQUIRED_CROSS_REPO");
    });

    it.each([
        ["QUERY_TOO_LONG", { ...valid, query: "x".repeat(4001) }],
        ["QUERY_REQUIRED", { ...valid, query: "   " }],
        ["USERNAME_INVALID", { ...valid, profileContext: { username: "bad name/../" } }],
        ["HISTORY_TOO_LONG", { ...valid, history: Array.from({ length: 41 }, () => ({ role: "user", content: "x" })) }],
        ["HISTORY_INVALID", { ...valid, history: [{ role: "system", content: "x" }] }],
        ["HISTORY_TURN_TOO_LONG", { ...valid, history: [{ role: "user", content: "x".repeat(20001) }] }],
        ["RUN_ID_INVALID", { ...valid, runId: "r".repeat(129) }],
        ["BODY_INVALID", [1, 2]],
    ])("rejects malformed input with %s before any generation", async (code, payload) => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        const response = await POST(jsonRequest(payload));
        expect(response.status).toBe(400);
        expect((await response.json()).code).toBe(code);
        expect(processProfileQueryStreamMock).not.toHaveBeenCalled();
        expect(reserveToolBudgetMock).not.toHaveBeenCalled();
    });

    it("rejects non-JSON bodies with INVALID_JSON", async () => {
        authMock.mockResolvedValue({ user: { id: "user_123" } });
        const response = await POST(
            new NextRequest("http://localhost/api/chat/profile", { method: "POST", body: "{nope" })
        );
        expect(response.status).toBe(400);
        expect((await response.json()).code).toBe("INVALID_JSON");
    });
});
