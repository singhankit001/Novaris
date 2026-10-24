import { createHash, createHmac } from "node:crypto";

export const ANON_COOKIE_NAME = "rm_anon_id";
const ANON_COOKIE_ID_PATTERN = /^[a-f0-9]{24}$/;

function firstHeaderValue(raw: string | null): string {
    if (!raw) return "unknown";
    const first = raw.split(",")[0]?.trim();
    return first && first.length > 0 ? first : "unknown";
}

/**
 * Client IP as set by the platform. Trust assumption: the app runs on Vercel, which overwrites
 * `x-real-ip` and `x-forwarded-for` on every inbound request, so the first hop cannot be spoofed
 * by the client. Behind any other proxy that passes these headers through, anonymous network
 * limits become bypassable; `cf-connecting-ip` is deliberately ignored for the same reason.
 */
export function getClientIp(headers: Headers): string {
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
    return firstHeaderValue(headers.get("x-forwarded-for"));
}

/**
 * Coarse network identity for budgets and rate limits: HMAC of the client IP keyed with
 * AUTH_SECRET, so raw IPs are never stored or logged and hashes cannot be precomputed.
 * IPv6 is reduced to its /64 so a client cannot rotate through its own prefix.
 */
export function getAnonymousNetworkId(headers: Headers): string {
    const ip = getClientIp(headers);
    const coarse = ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip;
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "novaris-dev-network-id";
    return `ip_${createHmac("sha256", secret).update(coarse).digest("hex").slice(0, 24)}`;
}

export function isValidAnonymousCookieId(value: string | null | undefined): value is string {
    return typeof value === "string" && ANON_COOKIE_ID_PATTERN.test(value.trim().toLowerCase());
}

export function getAnonymousCookieIdFromActorId(actorId: string): string | null {
    if (!actorId.startsWith("anon_")) return null;
    const raw = actorId.slice("anon_".length).trim().toLowerCase();
    return ANON_COOKIE_ID_PATTERN.test(raw) ? raw : null;
}

export function getAnonymousActorId(headers: Headers, anonymousCookieId?: string | null): string {
    if (isValidAnonymousCookieId(anonymousCookieId)) {
        return `anon_${anonymousCookieId.trim().toLowerCase()}`;
    }

    const ip = getClientIp(headers);
    const userAgent = headers.get("user-agent") ?? "unknown";
    const payload = `${ip}|${userAgent}`;
    const hash = createHash("sha256").update(payload).digest("hex").slice(0, 24);
    return `anon_${hash}`;
}
