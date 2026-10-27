import { beforeEach, describe, expect, it, vi } from "vitest";

const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }));
vi.mock("@vercel/kv", () => ({
    kv: {
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        setex: vi.fn(async (key: string, _ttl: number, value: unknown) => {
            store.set(key, value);
            return "OK";
        }),
    },
}));

async function loadCache() {
    vi.resetModules();
    return import("@/lib/cache");
}

describe("shared repo caches never serve private repositories", () => {
    beforeEach(() => store.clear());

    it("records a private marker instead of caching private metadata or full context", async () => {
        const cache = await loadCache();
        await cache.cacheRepoMetadata("acme", "secret", { name: "secret", private: true });
        await cache.cacheRepoFullContext("acme", "secret", {
            metadata: { name: "secret", private: true },
            languages: [],
            commits: [{ message: "internal" }],
            readme: "confidential",
        });

        expect([...store.keys()]).toEqual(["repo:private:acme/secret"]);
        expect(await cache.getCachedRepoMetadata("acme", "secret")).toBeNull();
        expect(await cache.getCachedRepoFullContext("acme", "secret")).toBeNull();
    });

    it("ignores entries written before the repo was known to be private, in a fresh process", async () => {
        store.set("repo:full:acme/secret", { metadata: { name: "secret" }, languages: [], commits: [], readme: "x" });
        store.set("tree:acme/secret:abc", [{ path: "src/a.ts" }]);
        store.set("commit_snapshot:repo:acme/secret:10", { data: [], fetchedAt: 1 });
        store.set("repo:private:acme/secret", 1);

        const cache = await loadCache();
        expect(await cache.getCachedRepoFullContext("acme", "secret")).toBeNull();
        expect(await cache.getCachedFileTree("acme", "secret", "abc")).toBeNull();
        expect(await cache.getCachedRepoCommitSnapshot("acme", "secret", 10)).toBeNull();

        await cache.cacheFileTree("acme", "secret", "def", [{ path: "b" }]);
        expect(store.has("tree:acme/secret:def")).toBe(false);
    });

    it("still caches public repositories", async () => {
        const cache = await loadCache();
        await cache.cacheRepoMetadata("acme", "open", { name: "open", private: false });
        expect(await cache.getCachedRepoMetadata("acme", "open")).toEqual({ name: "open", private: false });
    });
});
