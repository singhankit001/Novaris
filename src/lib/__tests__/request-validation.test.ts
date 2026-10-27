import { describe, expect, it } from "vitest";
import {
    readJsonBody,
    validateConversationMessages,
    validateConversationParams,
    validateRepoChatBody,
    validateRunBody,
} from "@/lib/request-validation";
import { toSafeStreamError } from "@/lib/streaming-types";

const repoBody = { query: "q", repoDetails: { owner: "o", repo: "r" } };
const code = (r: { ok: boolean; code?: string }) => (r.ok ? "ok" : r.code);

describe("request validation", () => {
    it("bounds file paths and shas", () => {
        expect(code(validateRepoChatBody({ ...repoBody, filePaths: Array(5001).fill("a") }))).toBe("FILE_PATHS_TOO_MANY");
        expect(code(validateRepoChatBody({ ...repoBody, filePaths: ["a".repeat(513)] }))).toBe("FILE_PATHS_INVALID");
        expect(code(validateRepoChatBody({ ...repoBody, fileShas: { a: 5 } }))).toBe("FILE_SHAS_INVALID");
        expect(code(validateRepoChatBody({ ...repoBody, filePaths: ["src/a.ts"], fileShas: { "src/a.ts": "abc" } }))).toBe("ok");
    });

    it("rejects bad owner/repo charset and path-traversal names", () => {
        for (const owner of ["a/b", "..", "a b", "", "x".repeat(101)]) {
            expect(code(validateRepoChatBody({ ...repoBody, repoDetails: { owner, repo: "r" } }))).toBe("REPO_INVALID");
        }
    });

    it("validates run creation and clientRequestId length", () => {
        expect(code(validateRunBody({ scope: "repo", owner: "o", repo: "r", clientRequestId: "c".repeat(129) }))).toBe("CLIENT_REQUEST_ID_INVALID");
        expect(code(validateRunBody({ scope: "x", clientRequestId: "c" }))).toBe("SCOPE_INVALID");
        expect(code(validateRunBody({ scope: "profile", username: "bad/name", clientRequestId: "c" }))).toBe("USERNAME_INVALID");
        expect(code(validateRunBody({ scope: "profile", username: "octocat", clientRequestId: "c" }))).toBe("ok");
    });

    it("caps stored conversation count and bytes", () => {
        expect(code(validateConversationMessages(Array(501).fill({ a: 1 })))).toBe("MESSAGES_TOO_MANY");
        expect(code(validateConversationMessages([{ content: "x".repeat(1_000_001) }]))).toBe("MESSAGES_TOO_LARGE");
        expect(code(validateConversationMessages("nope"))).toBe("MESSAGES_INVALID");
        expect(code(validateConversationParams(null, null, null))).toBe("CONVERSATION_REQUIRED");
        expect(code(validateConversationParams("o", null, null))).toBe("REPO_INVALID");
    });

    it("rejects oversized and malformed JSON bodies", async () => {
        const big = new Request("http://x", { method: "POST", body: "x".repeat(50) });
        expect(code(await readJsonBody(big, 10))).toBe("PAYLOAD_TOO_LARGE");
        expect(code(await readJsonBody(new Request("http://x", { method: "POST", body: "{" }), 100))).toBe("INVALID_JSON");
    });
});

describe("toSafeStreamError", () => {
    it("keeps client-relied-on codes and hides raw text", () => {
        expect(toSafeStreamError("anything", "AI_FUNCTION_TURN_ORDER").code).toBe("AI_FUNCTION_TURN_ORDER");
        const e = toSafeStreamError("PrismaClientKnownRequestError P1001 at db.internal:5432");
        expect(e.code).toBe("STORAGE_UNAVAILABLE");
        expect(e.message).not.toContain("5432");
        expect(toSafeStreamError("Not Found").code).toBe("GITHUB_NOT_FOUND");
        expect(toSafeStreamError("Bad credentials").code).toBe("GITHUB_AUTH_EXPIRED");
        expect(toSafeStreamError("weird").code).toBe("INTERNAL");
    });
});
