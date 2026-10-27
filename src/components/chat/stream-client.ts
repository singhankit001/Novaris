import type { MessageFailure } from "@/lib/chat-types";
import { parseStreamChunk } from "@/lib/streaming-parser";
import type { StreamUpdate } from "@/lib/streaming-types";
import { classifyFailure, type ClassifiedFailure } from "./analysis-machine";

/** Thrown for any non-2xx answer or `error` chunk. Carries what the classifier needs. */
export class StreamHttpError extends Error {
    status?: number;
    code?: string;
    retryAfterSeconds?: number;
    constructor(message: string, init: { status?: number; code?: string; retryAfterSeconds?: number } = {}) {
        super(message);
        this.name = "StreamHttpError";
        Object.assign(this, init);
    }
}

/** Reads `{error, code, retryAfterSeconds}` JSON bodies; falls back to the Retry-After header. */
export async function errorFromResponse(response: Response): Promise<StreamHttpError> {
    const raw = await response.text().catch(() => "");
    let message = raw.trim() || `The analysis service answered with HTTP ${response.status}.`;
    let code: string | undefined;
    let retryAfterSeconds: number | undefined;
    try {
        const parsed = JSON.parse(raw) as { error?: unknown; code?: unknown; retryAfterSeconds?: unknown };
        if (typeof parsed.error === "string" && parsed.error.trim()) message = parsed.error;
        if (typeof parsed.code === "string") code = parsed.code;
        if (typeof parsed.retryAfterSeconds === "number") retryAfterSeconds = parsed.retryAfterSeconds;
    } catch {
        // Body was not JSON; keep the raw text.
    }
    if (retryAfterSeconds === undefined) {
        const header = Number(response.headers.get("Retry-After"));
        if (Number.isFinite(header) && header > 0) retryAfterSeconds = header;
    }
    return new StreamHttpError(message, { status: response.status, code, retryAfterSeconds });
}

export function classifyThrown(error: unknown): ClassifiedFailure {
    if (error instanceof StreamHttpError) {
        return classifyFailure({ status: error.status, code: error.code, message: error.message, retryAfterSeconds: error.retryAfterSeconds });
    }
    return classifyFailure({ message: error instanceof Error ? error.message : undefined });
}

export function isAbort(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

/** Yields parsed NDJSON chunks; `error` chunks included; the caller decides how to fail. */
export async function* readChunks(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamUpdate> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const parsed = parseStreamChunk(buffer, decoder.decode(value, { stream: true }));
            buffer = parsed.buffer;
            for (const update of parsed.updates) yield update;
        }
        if (buffer.trim()) {
            for (const update of parseStreamChunk("", `${buffer}\n`).updates) yield update;
        }
    } finally {
        reader.releaseLock();
    }
}

export function normalizeStreamingLabel(message: string): string {
    return message.replace(/[ \t]*(?:\.{3}|…)+\s*$/g, "").trim();
}

export function formatToolStatusLabel(name: string, detail?: string): string {
    if (name === "googleSearch") return detail ? `Searching Google for ${detail}` : "Searching Google";
    if (detail) return detail.startsWith(`${name}(`) ? `Calling ${detail}` : `Calling ${name}: ${detail}`;
    return `Calling ${name}`;
}

export function failureNotice(failure: MessageFailure): string {
    return failure.retryAfterSeconds ? `${failure.message} Try again in ${failure.retryAfterSeconds} seconds.` : failure.message;
}
