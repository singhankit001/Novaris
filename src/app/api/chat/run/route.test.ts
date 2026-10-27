import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, findUniqueMock, createMock, findFirstMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    findUniqueMock: vi.fn(),
    createMock: vi.fn(),
    findFirstMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
    prisma: { chatRun: { findUnique: findUniqueMock, create: createMock, findFirst: findFirstMock } },
}));

import { GET, POST } from "@/app/api/chat/run/route";

const post = (body: unknown) =>
    new NextRequest("http://localhost/api/chat/run", { method: "POST", body: JSON.stringify(body) });
const valid = { scope: "repo", owner: "o", repo: "r", clientRequestId: "req-1" };

describe("/api/chat/run", () => {
    beforeEach(() => {
        authMock.mockReset().mockResolvedValue({ user: { id: "u1" } });
        findUniqueMock.mockReset();
        createMock.mockReset();
        findFirstMock.mockReset();
    });

    it("rejects an over-long clientRequestId and bad owner with codes", async () => {
        const long = await POST(post({ ...valid, clientRequestId: "c".repeat(129) }));
        expect(long.status).toBe(400);
        expect((await long.json()).code).toBe("CLIENT_REQUEST_ID_INVALID");
        const bad = await POST(post({ ...valid, owner: "a/b" }));
        expect((await bad.json()).code).toBe("REPO_INVALID");
        expect(createMock).not.toHaveBeenCalled();
    });

    it("is idempotent: a concurrent create that loses the unique race returns the winner's run", async () => {
        findUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
            id: "run_win", status: "RUNNING", partialText: "x", finalText: null,
        });
        createMock.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
        const res = await POST(post(valid));
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ runId: "run_win", status: "RUNNING" });
    });

    it("returns 503 STORAGE_UNAVAILABLE when the database is down", async () => {
        findUniqueMock.mockRejectedValue(new Error("ECONNREFUSED"));
        const res = await POST(post(valid));
        expect(res.status).toBe(503);
        expect((await res.json()).code).toBe("STORAGE_UNAVAILABLE");
    });

    it("GET splits a stored failure into errorCode and errorMessage", async () => {
        findFirstMock.mockResolvedValue({
            id: "r", status: "FAILED", partialText: "p", finalText: null,
            errorMessage: "AI_TIMEOUT: The AI service took too long to respond. Please try again.",
            updatedAt: new Date("2026-01-01T00:00:00Z"),
        });
        const res = await GET(new NextRequest("http://localhost/api/chat/run?runId=r"));
        expect(await res.json()).toMatchObject({
            status: "FAILED", partialText: "p", errorCode: "AI_TIMEOUT",
            errorMessage: "The AI service took too long to respond. Please try again.",
        });
    });
});
