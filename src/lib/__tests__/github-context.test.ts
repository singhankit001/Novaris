import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    getBranchMock,
    getTreeMock,
    getRepoMock,
    getReadmeMock,
    getCachedFileTreeMock,
    cacheFileTreeMock,
    getCachedRepoFullContextMock,
    cacheRepoFullContextMock,
    graphqlMock,
} = vi.hoisted(() => ({
    getBranchMock: vi.fn(),
    getTreeMock: vi.fn(),
    getRepoMock: vi.fn(),
    getReadmeMock: vi.fn(),
    getCachedFileTreeMock: vi.fn(),
    cacheFileTreeMock: vi.fn(),
    getCachedRepoFullContextMock: vi.fn(),
    cacheRepoFullContextMock: vi.fn(),
    graphqlMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
    unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("octokit", () => ({
    Octokit: class {
        rest = {
            repos: {
                getBranch: getBranchMock,
                get: getRepoMock,
                getReadme: getReadmeMock,
            },
            git: {
                getTree: getTreeMock,
            },
            users: {
                getByUsername: vi.fn(),
            },
            activity: {
                listReposStarredByUser: vi.fn(),
            },
        };
    },
}));

vi.mock("@octokit/graphql", () => ({
    graphql: graphqlMock,
}));

vi.mock("@/lib/cache", () => ({
    cacheFile: vi.fn(),
    getCachedFile: vi.fn(),
    cacheRepoMetadata: vi.fn(),
    getCachedRepoMetadata: vi.fn(),
    cacheProfileData: vi.fn(),
    getCachedProfileData: vi.fn(),
    cacheFileTree: cacheFileTreeMock,
    getCachedFileTree: getCachedFileTreeMock,
    cacheRepoFullContext: cacheRepoFullContextMock,
    getCachedRepoFullContext: getCachedRepoFullContextMock,
    getCachedFilesBatch: vi.fn(),
}));

import { getRepoFileTree } from "@/lib/github";

describe("getRepoFileTree", () => {
    beforeEach(() => {
        getBranchMock.mockReset();
        getTreeMock.mockReset();
        getCachedFileTreeMock.mockReset();
        cacheFileTreeMock.mockReset();
    });

    it("returns cached tree when available", async () => {
        getBranchMock.mockResolvedValue({ data: { commit: { sha: "abc123" } } });
        getCachedFileTreeMock.mockResolvedValue([
            { path: "src/index.ts", type: "blob", sha: "s1", size: 10 },
        ]);

        const result = await getRepoFileTree("acme", "cached-repo");

        expect(result).toEqual({
            tree: [{ path: "src/index.ts", type: "blob", sha: "s1", size: 10 }],
            hiddenFiles: [],
            treeSha: "abc123",
        });
        expect(getTreeMock).not.toHaveBeenCalled();
        expect(cacheFileTreeMock).not.toHaveBeenCalled();
    });

    it("filters hidden paths and caches a minimal tree", async () => {
        getBranchMock.mockResolvedValue({ data: { commit: { sha: "branchsha" } } });
        getCachedFileTreeMock.mockResolvedValue(null);
        getTreeMock.mockResolvedValue({
            data: {
                tree: [
                    { path: ".git/config", type: "blob", sha: "g1", mode: "100644", size: 1, url: "u1" },
                    { path: "node_modules/pkg/index.js", type: "blob", sha: "n1", mode: "100644", size: 2, url: "u2" },
                    { path: ".next/build.js", type: "blob", sha: "nx1", mode: "100644", size: 3, url: "u3" },
                    { path: ".idx/cache.json", type: "blob", sha: "i1", mode: "100644", size: 4, url: "u4" },
                    { path: ".vscode/settings.json", type: "blob", sha: "v1", mode: "100644", size: 5, url: "u5" },
                    { path: "foo.DS_Store", type: "blob", sha: "d1", mode: "100644", size: 6, url: "u6" },
                    { path: "src/index.ts", type: "blob", sha: "s1", mode: "100644", size: 7, url: "u7" },
                    { path: "src/components", type: "tree", sha: "t1", mode: "040000", size: 0, url: "u8" },
                ],
            },
        });

        const result = await getRepoFileTree("acme", "fresh-repo");

        expect(result.tree).toEqual([
            { path: "src/index.ts", type: "blob", sha: "s1", size: 7 },
            { path: "src/components", type: "tree", sha: "t1", size: 0 },
        ]);
        expect(result.hiddenFiles.map((f) => f.path)).toEqual([
            ".git/config",
            "node_modules/pkg/index.js",
            ".next/build.js",
            ".idx/cache.json",
            ".vscode/settings.json",
            "foo.DS_Store",
        ]);
        expect(cacheFileTreeMock).toHaveBeenCalledWith("acme", "fresh-repo", "branchsha", [
            { path: "src/index.ts", type: "blob", sha: "s1", size: 7 },
            { path: "src/components", type: "tree", sha: "t1", size: 0 },
        ]);
    });

    it("falls back to the provided branch name when branch lookup fails", async () => {
        getBranchMock.mockRejectedValue(new Error("branch lookup failed"));
        getCachedFileTreeMock.mockResolvedValue(null);
        getTreeMock.mockResolvedValue({
            data: {
                tree: [{ path: "src/main.ts", type: "blob", sha: "m1", size: 12 }],
            },
        });

        const result = await getRepoFileTree("acme", "fallback-repo", "develop");

        expect(result.tree).toEqual([{ path: "src/main.ts", type: "blob", sha: "m1", size: 12 }]);
        expect(getTreeMock).toHaveBeenCalledWith({
            owner: "acme",
            repo: "fallback-repo",
            tree_sha: "develop",
            recursive: "true",
        });
        expect(cacheFileTreeMock).toHaveBeenCalledWith("acme", "fallback-repo", "develop", [
            { path: "src/main.ts", type: "blob", sha: "m1", size: 12 },
        ]);
    });
});

