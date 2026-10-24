import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    authMock,
    generateAnswerStreamMock,
    trackAuthenticatedQueryEventMock,
    trackEventMock,
    reserveToolBudgetMock,
    settleMock,
    getAnonymousActorIdMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    generateAnswerStreamMock: vi.fn(),
    trackAuthenticatedQueryEventMock: vi.fn(),
    trackEventMock: vi.fn(),
    reserveToolBudgetMock: vi.fn(),
    settleMock: vi.fn(),
    getAnonymousActorIdMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
}));

vi.mock("@/app/actions", () => ({
    generateAnswerStream: generateAnswerStreamMock,
}));

vi.mock("@/lib/analytics", () => ({
    trackAuthenticatedQueryEvent: trackAuthenticatedQueryEventMock,
    trackEvent: trackEventMock,
}));

vi.mock("@/lib/cache", () => ({
    reserveToolBudget: reserveToolBudgetMock,
    acquireRunLock: vi.fn().mockResolvedValue(true),
    releaseRunLock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
    RATE_LIMIT_CHAT: {},
    enforceRateLimit: vi.fn().mockResolvedValue(null),
}));

process.env.GEMINI_API_KEY = "test-key";

vi.mock("@/lib/actor-id", () => ({
    ANON_COOKIE_NAME: "rm_anon_id",
    getAnonymousCookieIdFromActorId: vi.fn(),
    getAnonymousActorId: getAnonymousActorIdMock,
    getAnonymousNetworkId: vi.fn().mockReturnValue("ip_net"),
    isValidAnonymousCookieId: vi.fn().mockReturnValue(false),
}));

import { POST } from "@/app/api/chat/repo/route";

describe("POST /api/chat/repo", () => {
    beforeEach(() => {
        authMock.mockReset();
        generateAnswerStreamMock.mockReset();
        trackAuthenticatedQueryEventMock.mockReset();
        trackEventMock.mockReset();
        reserveToolBudgetMock.mockReset();
        settleMock.mockReset();
        getAnonymousActorIdMock.mockReset();

        settleMock.mockResolvedValue(undefined);
        reserveToolBudgetMock.mockResolvedValue({ status: "granted", reserved: 3, settle: settleMock });
        getAnonymousActorIdMock.mockReturnValue("anon_actor");
    });

    it("allows unauthenticated users in flash mode", async () => {
        authMock.mockResolvedValue(null);
        generateAnswerStreamMock.mockImplementation(async function* () {
            yield { type: "content", text: "hello", append: true };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/repo", {
            method: "POST",
            body: JSON.stringify({
                query: "What does this repo do?",
                repoDetails: { owner: "owner", repo: "repo" },
                filePaths: [],
                history: [],
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
        expect(generateAnswerStreamMock).toHaveBeenCalledWith(
            "What does this repo do?",
            { owner: "owner", repo: "repo" },
            [],
            undefined,
            "anonymous",
            "anon_actor",
            [],
            undefined,
            "flash",
            false
        );
        expect(reserveToolBudgetMock).toHaveBeenCalledWith("repo", "anonymous", ["anon_actor", "ip_net"]);
        expect(trackAuthenticatedQueryEventMock).not.toHaveBeenCalled();
        // Anonymous visitors should be tracked via trackEvent with the anon actorId
        expect(trackEventMock).toHaveBeenCalledWith("anon_actor", "query", expect.objectContaining({ device: "desktop" }));
    });

    it("tracks anonymous visitors via trackEvent with anon_ actorId", async () => {
        authMock.mockResolvedValue(null);
        getAnonymousActorIdMock.mockReturnValue("anon_abc123");
        generateAnswerStreamMock.mockImplementation(async function* () {
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/repo", {
            method: "POST",
            body: JSON.stringify({
                query: "Explain the code",
                repoDetails: { owner: "owner", repo: "repo" },
                filePaths: [],
                history: [],
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17)",
                "x-vercel-ip-country": "US",
            },
        });

        const response = await POST(request);
        await response.text();

        expect(response.status).toBe(200);
        expect(trackAuthenticatedQueryEventMock).not.toHaveBeenCalled();
        expect(trackEventMock).toHaveBeenCalledWith("anon_abc123", "query", {
            country: "US",
            device: "desktop",
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17)",
        });
    });

    it("returns INVALID_SESSION when user exists without id", async () => {
        authMock.mockResolvedValue({
            user: { name: "User", email: "user@example.com" },
        });

        const request = new NextRequest("http://localhost/api/chat/repo", {
            method: "POST",
            body: JSON.stringify({
                query: "What does this repo do?",
                repoDetails: { owner: "owner", repo: "repo" },
                filePaths: [],
                history: [],
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
        expect(generateAnswerStreamMock).not.toHaveBeenCalled();
        expect(trackAuthenticatedQueryEventMock).not.toHaveBeenCalled();
        expect(trackEventMock).not.toHaveBeenCalled();
    });

    it("returns login-required code for anonymous thinking mode", async () => {
        authMock.mockResolvedValue(null);

        const request = new NextRequest("http://localhost/api/chat/repo", {
            method: "POST",
            body: JSON.stringify({
                query: "Deep reasoning",
                repoDetails: { owner: "owner", repo: "repo" },
                filePaths: [],
                history: [],
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
        expect(generateAnswerStreamMock).not.toHaveBeenCalled();
    });

    it("continues streaming with tool calls disabled when budget is exhausted", async () => {
        authMock.mockResolvedValue(null);
        reserveToolBudgetMock.mockResolvedValueOnce({ status: "exhausted" });
        generateAnswerStreamMock.mockImplementation(async function* () {
            yield { type: "status", message: "Tool calls are paused for this window.", progress: 50 };
            yield { type: "content", text: "fallback answer", append: true };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/repo", {
            method: "POST",
            body: JSON.stringify({
                query: "What does this repo do?",
                repoDetails: { owner: "owner", repo: "repo" },
                filePaths: [],
                history: [],
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
            },
        });

        const response = await POST(request);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(generateAnswerStreamMock).toHaveBeenCalled();
        expect(generateAnswerStreamMock.mock.calls[0]?.[9]).toBe(true);
        expect(text).toContain("fallback answer");
        expect(settleMock).not.toHaveBeenCalledWith(expect.anything(), true);
    });

    it("tracks analytics for authenticated users via trackAuthenticatedQueryEvent only", async () => {
        authMock.mockResolvedValue({
            user: { id: "user_123", email: "user@example.com" },
        });
        generateAnswerStreamMock.mockImplementation(async function* () {
            yield { type: "content", text: "hello" };
            yield { type: "tool", name: "fetch_recent_commits", usageUnits: 3 };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/repo", {
            method: "POST",
            body: JSON.stringify({
                query: "What does this repo do?",
                repoDetails: { owner: "owner", repo: "repo" },
                filePaths: [],
                history: [],
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
        expect(settleMock).toHaveBeenCalledWith(3, true);
    });

    it("does not bill native web-search tool units", async () => {
        authMock.mockResolvedValue({
            user: { id: "user_123", email: "user@example.com" },
        });
        generateAnswerStreamMock.mockImplementation(async function* () {
            yield { type: "tool", name: "googleSearch", usageUnits: 2 };
            yield { type: "content", text: "hello" };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/repo", {
            method: "POST",
            body: JSON.stringify({
                query: "What does this repo do?",
                repoDetails: { owner: "owner", repo: "repo" },
                filePaths: [],
                history: [],
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
        generateAnswerStreamMock.mockImplementation(async function* () {
            yield { type: "tool", name: "fetch_recent_commits", usageUnits: 1, billable: false };
            yield { type: "tool", name: "fetch_recent_commits", usageUnits: 1, billable: true };
            yield { type: "content", text: "hello" };
            yield { type: "complete", relevantFiles: [] };
        });

        const request = new NextRequest("http://localhost/api/chat/repo", {
            method: "POST",
            body: JSON.stringify({
                query: "What does this repo do?",
                repoDetails: { owner: "owner", repo: "repo" },
                filePaths: [],
                history: [],
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
});
