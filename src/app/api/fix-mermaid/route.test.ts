import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { fixMermaidSyntaxMock, enforceRateLimitMock } = vi.hoisted(() => ({
    fixMermaidSyntaxMock: vi.fn(),
    enforceRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
    RATE_LIMIT_FIX_MERMAID: {},
    enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/lib/gemini", () => ({
    fixMermaidSyntax: fixMermaidSyntaxMock,
}));

import { POST } from "@/app/api/fix-mermaid/route";

describe("POST /api/fix-mermaid", () => {
    beforeEach(() => {
        fixMermaidSyntaxMock.mockReset();
        enforceRateLimitMock.mockReset();
        enforceRateLimitMock.mockResolvedValue(null);
    });

    it("returns the limiter's 429 without calling the model", async () => {
        enforceRateLimitMock.mockResolvedValue(
            new Response(JSON.stringify({ code: "RATE_LIMITED" }), { status: 429, headers: { "Retry-After": "5" } })
        );
        const response = await POST(
            new NextRequest("http://localhost/api/fix-mermaid", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ code: "flowchart TD\nA-->B" }),
            })
        );
        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("5");
        expect(fixMermaidSyntaxMock).not.toHaveBeenCalled();
    });

    it("accepts legacy payload with only code", async () => {
        fixMermaidSyntaxMock.mockResolvedValue("flowchart TD\nA-->B");

        const request = new NextRequest("http://localhost/api/fix-mermaid", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: "flowchart TD\nA-->B" }),
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ fixed: "flowchart TD\nA-->B" });
        expect(fixMermaidSyntaxMock).toHaveBeenCalledWith("flowchart TD\nA-->B", {
            syntaxError: undefined,
            diagramType: undefined,
        });
    });

    it("forwards syntaxError and diagramType when provided", async () => {
        fixMermaidSyntaxMock.mockResolvedValue("classDiagram\nclass Repo");

        const request = new NextRequest("http://localhost/api/fix-mermaid", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                code: "classDiagram\nclass Repo",
                syntaxError: "Parse error on line 2",
                diagramType: "classDiagram",
            }),
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ fixed: "classDiagram\nclass Repo" });
        expect(fixMermaidSyntaxMock).toHaveBeenCalledWith("classDiagram\nclass Repo", {
            syntaxError: "Parse error on line 2",
            diagramType: "classDiagram",
        });
    });

    it("returns 400 when code is missing", async () => {
        const request = new NextRequest("http://localhost/api/fix-mermaid", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ syntaxError: "Parse error" }),
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({ error: "Missing code parameter" });
        expect(fixMermaidSyntaxMock).not.toHaveBeenCalled();
    });
    it("rejects oversized diagrams without calling the model", async () => {
        const request = new NextRequest("http://localhost/api/fix-mermaid", {
            method: "POST",
            body: JSON.stringify({ code: "graph TD\n" + "A-->B\n".repeat(5000) }),
            headers: { "content-type": "application/json" },
        });
        const response = await POST(request);
        expect(response.status).toBe(413);
        expect(fixMermaidSyntaxMock).not.toHaveBeenCalled();
    });
});
