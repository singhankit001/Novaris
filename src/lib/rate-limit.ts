import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { getAnonymousNetworkId } from "@/lib/actor-id";

/**
 * Fixed-window request limiter on KV (INCR + EXPIRE on the first hit of a window).
 * ponytail: fixed windows allow up to 2x the limit across a window edge. Upgrade to a sliding
 * window or token bucket only if burst abuse shows up in the logs.
 * ponytail: the IP limit is a multiple of the actor limit so a shared NAT is not locked out by
 * one noisy user. Tune with traffic data.
 */
export interface RateLimitPolicy {
    /** Stable route label used in the key. */
    route: string;
    /** Requests per window for one actor (user id or anonymous actor id). */
    actorLimit: number;
    /** Requests per window for one network (HMAC of client IP). */
    ipLimit: number;
    windowSeconds: number;
    /** Gemini-spending routes fail closed when KV is down; others allow and log once. */
    failClosed: boolean;
}

export const RATE_LIMIT_CHAT: RateLimitPolicy = {
    route: "chat",
    actorLimit: 20,
    ipLimit: 60,
    windowSeconds: 60,
    failClosed: true,
};

export const RATE_LIMIT_FIX_MERMAID: RateLimitPolicy = {
    route: "fix-mermaid",
    actorLimit: 30,
    ipLimit: 90,
    windowSeconds: 60,
    failClosed: true,
};

let loggedLimiterFailure = false;

export function resetRateLimiterLogStateForTests(): void {
    loggedLimiterFailure = false;
}

async function hit(key: string, windowSeconds: number): Promise<number> {
    const count = await kv.incr(key);
    if (count === 1) {
        await kv.expire(key, windowSeconds + 1);
    }
    return count;
}

/**
 * Returns a ready 429/503 response when the caller must stop, or null to proceed.
 * `actorId` is the authenticated user id or the anonymous actor id.
 */
export async function enforceRateLimit(
    headers: Headers,
    actorId: string,
    policy: RateLimitPolicy
): Promise<NextResponse | null> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowIndex = Math.floor(nowSeconds / policy.windowSeconds);
    const retryAfterSeconds = Math.max(1, (windowIndex + 1) * policy.windowSeconds - nowSeconds);
    const ipId = getAnonymousNetworkId(headers);

    try {
        const [actorCount, ipCount] = await Promise.all([
            hit(`rl:${policy.route}:a:${actorId}:${windowIndex}`, policy.windowSeconds),
            hit(`rl:${policy.route}:i:${ipId}:${windowIndex}`, policy.windowSeconds),
        ]);
        if (actorCount > policy.actorLimit || ipCount > policy.ipLimit) {
            return NextResponse.json(
                {
                    error: "Too many requests. Please wait a moment and try again.",
                    code: "RATE_LIMITED",
                    retryAfterSeconds,
                },
                { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
            );
        }
        return null;
    } catch (error) {
        if (!loggedLimiterFailure) {
            loggedLimiterFailure = true;
            console.error("Rate limiter unavailable:", error);
        }
        // Outside production with no KV configured at all (local dev, tests), limiting is simply off,
        // like the other KV-backed features. In production a missing or failing KV fails closed.
        const kvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
        if (policy.failClosed && (kvConfigured || process.env.NODE_ENV === "production")) {
            return NextResponse.json(
                {
                    error: "Request limiting is temporarily unavailable. Please try again shortly.",
                    code: "LIMITER_UNAVAILABLE",
                },
                { status: 503, headers: { "Retry-After": "10" } }
            );
        }
        return null;
    }
}
