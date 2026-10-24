import { beforeEach, describe, expect, it, vi } from "vitest";

const counters = vi.hoisted(() => ({ map: new Map<string, number>(), fail: false }));

vi.mock("@vercel/kv", () => ({
    kv: {
        incr: async (key: string) => {
            if (counters.fail) throw new Error("kv down");
            const next = (counters.map.get(key) ?? 0) + 1;
            counters.map.set(key, next);
            return next;
        },
        expire: async () => 1,
    },
}));

import { enforceRateLimit, resetRateLimiterLogStateForTests, type RateLimitPolicy } from "@/lib/rate-limit";

const policy: RateLimitPolicy = { route: "t", actorLimit: 2, ipLimit: 5, windowSeconds: 60, failClosed: true };
const headers = new Headers({ "x-real-ip": "203.0.113.9" });

describe("enforceRateLimit", () => {
    beforeEach(() => {
        counters.map.clear();
        counters.fail = false;
        resetRateLimiterLogStateForTests();
    });

    it("returns 429 with Retry-After and RATE_LIMITED after the actor limit", async () => {
        expect(await enforceRateLimit(headers, "a1", policy)).toBeNull();
        expect(await enforceRateLimit(headers, "a1", policy)).toBeNull();
        const blocked = await enforceRateLimit(headers, "a1", policy);
        expect(blocked?.status).toBe(429);
        const retry = Number(blocked?.headers.get("Retry-After"));
        expect(retry).toBeGreaterThanOrEqual(1);
        expect(await blocked?.json()).toEqual({
            error: expect.any(String),
            code: "RATE_LIMITED",
            retryAfterSeconds: retry,
        });
    });

    it("limits a network across many fresh actors", async () => {
        for (let i = 0; i < 5; i++) expect(await enforceRateLimit(headers, `fresh${i}`, policy)).toBeNull();
        expect((await enforceRateLimit(headers, "fresh6", policy))?.status).toBe(429);
    });

    it("fails closed with 503 LIMITER_UNAVAILABLE when a configured KV errors on spending routes", async () => {
        vi.stubEnv("KV_REST_API_URL", "https://kv.test");
        vi.stubEnv("KV_REST_API_TOKEN", "t");
        counters.fail = true;
        const res = await enforceRateLimit(headers, "a1", policy);
        expect(res?.status).toBe(503);
        expect((await res?.json()).code).toBe("LIMITER_UNAVAILABLE");
        vi.unstubAllEnvs();
    });

    it("fails closed in production even when KV is not configured", async () => {
        vi.stubEnv("KV_REST_API_URL", "");
        vi.stubEnv("NODE_ENV", "production");
        counters.fail = true;
        expect((await enforceRateLimit(headers, "a1", policy))?.status).toBe(503);
        vi.unstubAllEnvs();
    });

    it("stays out of the way in development when KV is not configured", async () => {
        vi.stubEnv("KV_REST_API_URL", "");
        vi.stubEnv("NODE_ENV", "development");
        counters.fail = true;
        expect(await enforceRateLimit(headers, "a1", policy)).toBeNull();
        vi.unstubAllEnvs();
    });

    it("allows on KV errors for non-spending routes", async () => {
        counters.fail = true;
        expect(await enforceRateLimit(headers, "a1", { ...policy, failClosed: false })).toBeNull();
    });
});
