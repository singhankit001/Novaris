import { describe, expect, it } from "vitest";
import authConfig from "@/lib/auth.config";
import { INVALID_SESSION_ERROR_CODE } from "@/lib/session-guard";

describe("auth.config callbacks", () => {
    it("uses token.sub as fallback id in jwt callback", async () => {
        const jwt = authConfig.callbacks?.jwt;
        expect(jwt).toBeTypeOf("function");

        const result = await jwt?.({
            token: { sub: "user_sub_id" },
            profile: undefined,
            account: undefined,
            user: undefined,
            trigger: "update",
            session: null,
            isNewUser: false,
        } as never);

        expect(result?.id).toBe("user_sub_id");
        expect(result?.error).toBeUndefined();
    });

    it("marks session as invalid when no user id can be resolved", async () => {
        const session = authConfig.callbacks?.session;
        expect(session).toBeTypeOf("function");

        const result = await session?.({
            session: {
                expires: "2099-01-01T00:00:00.000Z",
                user: {
                    name: "Test",
                    email: "test@example.com",
                    image: null,
                },
            },
            token: {},
            user: undefined,
            newSession: undefined,
            trigger: "update",
        } as never);

        const resultWithError = result as { error?: string } | undefined;
        expect(resultWithError?.error).toBe(INVALID_SESSION_ERROR_CODE);
    });

    it("never copies the GitHub OAuth token or scope onto the browser-visible session", async () => {
        const session = authConfig.callbacks?.session;
        const result = await session?.({
            session: { expires: "2099-01-01T00:00:00.000Z", user: { name: "Test", email: null, image: null } },
            token: { id: "user_1", username: "octocat", accessToken: "gho_secret", oauthScope: "repo" },
            user: undefined,
            newSession: undefined,
            trigger: "update",
        } as never);

        expect(JSON.stringify(result)).not.toContain("gho_secret");
        expect(JSON.stringify(result)).not.toContain("oauthScope");
        expect((result as { user?: { username?: string } })?.user?.username).toBe("octocat");
    });

    it("populates username and email for Google sign-in", async () => {
        const jwt = authConfig.callbacks?.jwt;
        const result = await jwt?.({
            token: { sub: "google_user_123" },
            profile: { name: "Google Developer" },
            account: { provider: "google", access_token: "ya29.secret" },
            user: { id: "google_user_123", email: "dev@gmail.com", name: "Google Developer" },
            trigger: "signIn",
            session: null,
            isNewUser: false,
        } as never);

        expect(result?.id).toBe("google_user_123");
        expect(result?.username).toBe("Google Developer");
        expect(result?.email).toBe("dev@gmail.com");
        // Google access token must not be set as the GitHub accessToken
        expect(result?.accessToken).toBeUndefined();
    });

    it("populates session for Google users", async () => {
        const session = authConfig.callbacks?.session;
        const result = await session?.({
            session: { expires: "2099-01-01T00:00:00.000Z", user: { name: "Google Developer", email: "dev@gmail.com", image: null } },
            token: { id: "google_123", username: "Google Developer", email: "dev@gmail.com" },
            user: undefined,
            newSession: undefined,
            trigger: "update",
        } as never);

        expect(result?.user?.id).toBe("google_123");
        expect(result?.user?.username).toBe("Google Developer");
        expect(result?.user?.email).toBe("dev@gmail.com");
    });
});
