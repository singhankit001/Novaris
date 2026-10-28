import { describe, expect, it, vi } from "vitest";
import { executeRepoQueryStream, numberLines } from "@/lib/services/query-pipeline";
import type { StreamUpdate } from "@/lib/streaming-types";

vi.mock("@/lib/cache", () => ({
    resolveAnonymousConsecutivePaths: vi.fn(async () => []),
}));

vi.mock("@/lib/gemini", () => ({
    analyzeFileSelection: vi.fn(),
    answerWithContextStream: vi.fn(),
}));

vi.mock("@/lib/github", () => ({
    getFileContentBatch: vi.fn(),
    getFileContentBatchWithStats: vi.fn(),
}));

async function run(params: Parameters<typeof executeRepoQueryStream>[0], deps: Parameters<typeof executeRepoQueryStream>[1]) {
    const updates: StreamUpdate[] = [];
    for await (const update of executeRepoQueryStream(params, deps)) updates.push(update);
    return updates;
}

describe("executeRepoQueryStream", () => {
    it("sends numbered file content so cited line numbers are real", async () => {
        const streamAnswer = vi.fn(async function* () {
            yield "answer";
        });
        await run(
            { query: "what is value?", owner: "acme", repo: "widget", filePaths: ["src/core.ts"] },
            {
                analyzeFiles: vi.fn().mockResolvedValue(["src/core.ts"]),
                fetchFiles: vi.fn().mockResolvedValue([{ path: "src/core.ts", content: "import x from 'y';\nexport const value = 1;" }]),
                streamAnswer,
            }
        );
        const context = (streamAnswer.mock.calls[0] as unknown[])[1] as string;
        expect(context).toContain("--- FILE: src/core.ts ---\n1| import x from 'y';\n2| export const value = 1;");
    });

    it("answers every question afresh instead of replaying a cached answer for the same text", async () => {
        const streamAnswer = vi.fn(async function* () {
            yield "fresh";
        });
        const deps = {
            analyzeFiles: vi.fn().mockResolvedValue([]),
            fetchFiles: vi.fn().mockResolvedValue([]),
            streamAnswer,
        };
        await run({ query: "explain more", owner: "acme", repo: "widget", filePaths: [] }, deps);
        await run({ query: "explain more", owner: "acme", repo: "widget", filePaths: [] }, deps);
        expect(streamAnswer).toHaveBeenCalledTimes(2);
    });

    it("skips a file over the token budget but keeps smaller files after it", async () => {
        const streamAnswer = vi.fn(async function* () {
            yield "ok";
        });
        const huge = "x ".repeat(300_000);
        await run(
            { query: "q", owner: "acme", repo: "widget", filePaths: ["big.txt", "small.ts"] },
            {
                analyzeFiles: vi.fn().mockResolvedValue(["big.txt", "small.ts"]),
                fetchFiles: vi.fn().mockResolvedValue([
                    { path: "big.txt", content: huge },
                    { path: "small.ts", content: "export {};" },
                ]),
                streamAnswer,
            }
        );
        const context = (streamAnswer.mock.calls[0] as unknown[])[1] as string;
        expect(context).toContain("--- FILE: small.ts ---");
        expect(context).not.toContain("--- FILE: big.txt ---");
        expect(context).toContain("Not loaded (over the");
    });

    it("passes disableToolCalls to the answer stream dependency", async () => {
        const streamAnswer = vi.fn(async function* () {
            yield "No-tool response";
        });
        await run(
            { query: "summarize core logic", owner: "acme", repo: "widget", filePaths: ["src/core.ts"], disableToolCalls: true },
            {
                analyzeFiles: vi.fn().mockResolvedValue(["src/core.ts"]),
                fetchFiles: vi.fn().mockResolvedValue([{ path: "src/core.ts", content: "export const value = 1;" }]),
                streamAnswer,
            }
        );
        expect((streamAnswer.mock.calls[0] as unknown[])?.[6]).toBe(true);
    });
});

describe("numberLines", () => {
    it("prefixes 1-based line numbers", () => {
        expect(numberLines("a\nb")).toBe("1| a\n2| b");
    });
});
