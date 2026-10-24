import { describe, expect, it } from "vitest";

import {
    getAnonymousActorId,
    getAnonymousCookieIdFromActorId,
    isValidAnonymousCookieId,
} from "@/lib/actor-id";

describe("actor-id helpers", () => {
    it("prefers valid anonymous cookie ids over header hashing", () => {
        const headers = new Headers({
            "x-forwarded-for": "203.0.113.10",
            "user-agent": "Mozilla/5.0",
        });

        expect(getAnonymousActorId(headers, "abcdef123456abcdef123456")).toBe("anon_abcdef123456abcdef123456");
    });

    it("falls back to deterministic hash when cookie id is missing", () => {
        const headers = new Headers({
            "x-forwarded-for": "203.0.113.10",
            "user-agent": "Mozilla/5.0",
        });
        const actorId = getAnonymousActorId(headers, null);
        expect(actorId).toMatch(/^anon_[a-f0-9]{24}$/);
    });

    it("validates and extracts cookie ids safely", () => {
        expect(isValidAnonymousCookieId("abcdef123456abcdef123456")).toBe(true);
        expect(isValidAnonymousCookieId("bad-value")).toBe(false);
        expect(getAnonymousCookieIdFromActorId("anon_abcdef123456abcdef123456")).toBe("abcdef123456abcdef123456");
        expect(getAnonymousCookieIdFromActorId("anon_bad")).toBeNull();
    });
});

describe("anonymous network identity", () => {
    it("is stable per client IP, ignores the cookie, and never contains the raw IP", async () => {
        const { getAnonymousNetworkId } = await import("@/lib/actor-id");
        const a = getAnonymousNetworkId(new Headers({ "x-real-ip": "203.0.113.10" }));
        const b = getAnonymousNetworkId(new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" }));
        const c = getAnonymousNetworkId(new Headers({ "x-real-ip": "203.0.113.11" }));
        expect(a).toBe(b);
        expect(a).not.toBe(c);
        expect(a).toMatch(/^ip_[a-f0-9]{24}$/);
        expect(a).not.toContain("203");
    });

    it("keys IPv6 clients by /64 so rotating the host part does not mint a new identity", async () => {
        const { getAnonymousNetworkId } = await import("@/lib/actor-id");
        const a = getAnonymousNetworkId(new Headers({ "x-real-ip": "2001:db8:1:2:aaaa:bbbb:cccc:1" }));
        const b = getAnonymousNetworkId(new Headers({ "x-real-ip": "2001:db8:1:2:1111:2222:3333:4444" }));
        expect(a).toBe(b);
    });
});
