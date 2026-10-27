import { afterEach, describe, expect, it, vi } from "vitest";
import { getStarredRepos, octokit } from "@/lib/github";

const repo = (i: number) => ({ name: `r${i}`, full_name: `o/r${i}`, default_branch: "main" });
const page = (count: number, offset = 0) => ({ data: Array.from({ length: count }, (_, i) => repo(offset + i)) });

function mockStarred(impl: (params: { page: number }) => unknown) {
    return vi
        .spyOn(octokit.rest.activity, "listReposStarredByUser")
        .mockImplementation((async (params: { page: number }) => impl(params)) as never);
}

describe("getStarredRepos", () => {
    afterEach(() => vi.restoreAllMocks());

    it("distinguishes a real empty list from a failure", async () => {
        mockStarred(() => page(0));
        expect(await getStarredRepos("octocat")).toEqual({ status: "ok", repos: [], truncated: false });
    });

    it("paginates past the first page and flags truncation at the page cap", async () => {
        const spy = mockStarred(({ page: n }) => (n < 3 ? page(100, n * 100) : page(7, n * 100)));
        const partial = await getStarredRepos("octocat");
        expect(partial.status === "ok" && partial.repos.length).toBe(207);
        expect(partial.status === "ok" && partial.truncated).toBe(false);
        expect(spy).toHaveBeenCalledTimes(3);

        spy.mockImplementation((async ({ page: n }: { page: number }) => page(100, n * 100)) as never);
        const capped = await getStarredRepos("octocat");
        expect(capped.status === "ok" && capped.truncated).toBe(true);
        expect(capped.status === "ok" && capped.repos.length).toBe(400);
    });

    it.each([
        [403, "rate_limited"],
        [429, "rate_limited"],
        [404, "not_found"],
        [401, "unauthorized"],
        [undefined, "unavailable"],
    ])("reports HTTP %s as %s instead of an empty list", async (status, reason) => {
        mockStarred(() => {
            throw Object.assign(new Error("boom"), status ? { status } : {});
        });
        vi.spyOn(console, "error").mockImplementation(() => {});
        const result = await getStarredRepos("octocat");
        expect(result).toMatchObject({ status: "error", reason });
    });
});
