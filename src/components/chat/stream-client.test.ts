import { describe, expect, it } from "vitest";
import { errorFromResponse, formatToolStatusLabel, normalizeStreamingLabel, readChunks } from "./stream-client";

function streamOf(parts: string[]) {
    const enc = new TextEncoder();
    return new ReadableStream<Uint8Array>({
        start(c) {
            for (const p of parts) c.enqueue(enc.encode(p));
            c.close();
        },
    });
}

describe("readChunks", () => {
    it("reassembles lines split across reads and flushes a trailing line", async () => {
        const out = [];
        for await (const u of readChunks(streamOf(['{"type":"content","text":"he', 'llo","append":true}\n{"type":"files","files":["a"]}']))) out.push(u);
        expect(out).toEqual([
            { type: "content", text: "hello", append: true },
            { type: "files", files: ["a"] },
        ]);
    });
});

describe("errorFromResponse", () => {
    it("reads the 429 JSON body and Retry-After", async () => {
        const res = new Response(JSON.stringify({ error: "Too many", code: "RATE_LIMITED", retryAfterSeconds: 9 }), { status: 429, headers: { "Retry-After": "9" } });
        const e = await errorFromResponse(res);
        expect(e).toMatchObject({ status: 429, code: "RATE_LIMITED", retryAfterSeconds: 9, message: "Too many" });
    });
    it("falls back to the header for non-JSON bodies", async () => {
        const e = await errorFromResponse(new Response("busy", { status: 503, headers: { "Retry-After": "10" } }));
        expect(e).toMatchObject({ status: 503, retryAfterSeconds: 10, message: "busy" });
    });
});

describe("labels", () => {
    it("strips trailing ellipsis and formats tools", () => {
        expect(normalizeStreamingLabel("Reading files...")).toBe("Reading files");
        expect(formatToolStatusLabel("readFile", "readFile(a.ts)")).toBe("Calling readFile(a.ts)");
        expect(formatToolStatusLabel("googleSearch")).toBe("Searching Google");
    });
});
