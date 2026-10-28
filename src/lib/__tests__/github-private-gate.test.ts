import { beforeEach, describe, expect, it, vi } from "vitest";

const { headersMock, getTokenMock, markRepoPrivateMock, isRepoMarkedPrivateMock } = vi.hoisted(() => ({
    headersMock: vi.fn(),
    getTokenMock: vi.fn(),
    markRepoPrivateMock: vi.fn(),
    isRepoMarkedPrivateMock: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next-auth/jwt", () => ({ getToken: getTokenMock }));
vi.mock("@/lib/cache", () => ({ markRepoPrivate: markRepoPrivateMock, isRepoMarkedPrivate: isRepoMarkedPrivateMock }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("fetchGitHubAPI token policy", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
        process.env.GITHUB_TOKEN = "ghp_system";
        headersMock.mockResolvedValue(new Headers());
        getTokenMock.mockResolvedValue(null);
        isRepoMarkedPrivateMock.mockResolvedValue(false);
        markRepoPrivateMock.mockResolvedValue(undefined);
    });

    it("hides private repositories from callers without their own token", async () => {
        const fetchMock = vi.fn(async () => json({ private: true, full_name: "acme/secret" }));
        vi.stubGlobal("fetch", fetchMock);
        const { fetchGitHubAPI } = await import("@/lib/github-api");

        const contents = await fetchGitHubAPI("https://api.github.com/repos/acme/secret/contents/.env");
        expect(contents.status).toBe(404);
        expect(markRepoPrivateMock).toHaveBeenCalledWith("acme", "secret");
        // Only the visibility probe reached GitHub; the file request never did.
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("serves public repositories with the system token", async () => {
        const fetchMock = vi.fn(async (url: string) => (url.endsWith("/acme/open") ? json({ private: false }) : json({ content: "" })));
        vi.stubGlobal("fetch", fetchMock);
        const { fetchGitHubAPI } = await import("@/lib/github-api");

        const repo = await fetchGitHubAPI("https://api.github.com/repos/acme/open");
        expect(repo.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const file = await fetchGitHubAPI("https://api.github.com/repos/acme/open/contents/a.ts");
        expect(file.status).toBe(200);
    });

    it("reports an expired user token instead of retrying as the service account", async () => {
        getTokenMock.mockResolvedValue({ accessToken: "gho_user" });
        const fetchMock = vi.fn(async () => json({ message: "Bad credentials" }, 401));
        vi.stubGlobal("fetch", fetchMock);
        const { fetchGitHubAPI } = await import("@/lib/github-api");

        await expect(fetchGitHubAPI("https://api.github.com/repos/acme/open")).rejects.toThrow(/token expired/);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
