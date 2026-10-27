import { beforeEach, describe, expect, it, vi } from "vitest";
import { encode } from "next-auth/jwt";

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }));
vi.mock("next/headers", () => ({ headers: headersMock }));

const SECRET = "test-secret-at-least-32-characters-long";

async function cookieFor(name: string, accessToken: string) {
    const jwe = await encode({ token: { sub: "u1", accessToken, oauthScope: "read:user repo" }, secret: SECRET, salt: name });
    return `${name}=${jwe}`;
}

describe("getSessionGitHubAuth", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.AUTH_SECRET = SECRET;
        headersMock.mockReset();
    });

    it("reads the token and scope from the encrypted session cookie (http and https cookie names)", async () => {
        const { getSessionGitHubAuth } = await import("@/lib/github-api");

        headersMock.mockResolvedValue(new Headers({ cookie: await cookieFor("authjs.session-token", "gho_plain") }));
        expect(await getSessionGitHubAuth()).toEqual({ accessToken: "gho_plain", scope: "read:user repo" });

        headersMock.mockResolvedValue(new Headers({ cookie: await cookieFor("__Secure-authjs.session-token", "gho_secure") }));
        expect((await getSessionGitHubAuth()).accessToken).toBe("gho_secure");
    });

    it("returns no token without a session, with a forged cookie, or outside a request", async () => {
        const { getSessionGitHubAuth } = await import("@/lib/github-api");

        headersMock.mockResolvedValue(new Headers());
        expect(await getSessionGitHubAuth()).toEqual({});

        headersMock.mockResolvedValue(new Headers({ cookie: "authjs.session-token=not-a-jwe" }));
        expect((await getSessionGitHubAuth()).accessToken).toBeUndefined();

        headersMock.mockRejectedValue(new Error("headers() called outside a request scope"));
        expect(await getSessionGitHubAuth()).toEqual({});
    });
});
