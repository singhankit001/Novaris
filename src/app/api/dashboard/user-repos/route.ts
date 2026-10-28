import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getInvalidSessionApiError, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";
import { getSessionGitHubAuth } from "@/lib/github-api";

const MAX_PAGES = 5;

export async function GET() {
    const session = await auth();
    const authState = getSessionAuthState(session);

    if (authState === "unauthenticated") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (authState === "invalid") {
        return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
    }

    if (!getSessionUserId(session)) {
        return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
    }

    // /user/repos lists the token owner's repositories, so only the caller's own token is valid here.
    // The system token would list the Novaris service account's repositories instead.
    const { accessToken, scope } = await getSessionGitHubAuth();
    if (!accessToken) {
        return NextResponse.json(
            { error: "GitHub authorization required", code: "GITHUB_TOKEN_MISSING" },
            { status: 401 }
        );
    }

    try {
        // ponytail: up to 5 sequential pages (500 repos); move to client-side paging if users hit the cap.
        const repos: unknown[] = [];
        let truncated = false;
        for (let page = 1; page <= MAX_PAGES; page++) {
            const res = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=100&page=${page}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github.v3+json",
                },
                cache: "no-store", // per-user response; must not enter the shared data cache
            });

            if (!res.ok) {
                console.error("GitHub API error fetching user repos", await res.text());
                if (res.status === 401) {
                    return NextResponse.json({ error: "Your GitHub sign-in has expired. Sign in again.", code: "GITHUB_AUTH_EXPIRED" }, { status: 401 });
                }
                return NextResponse.json({ error: "Failed to fetch repositories" }, { status: res.status });
            }

            const data: unknown = await res.json();
            const pageRepos = Array.isArray(data) ? data : [];
            repos.push(...pageRepos);
            const hasNext = /rel="next"/.test(res.headers.get("link") ?? "");
            if (!hasNext) break;
            if (page === MAX_PAGES) truncated = true;
        }

        // Private repositories are only listed when the user granted the `repo` OAuth scope.
        const hasPrivateAccess = (scope ?? "").split(/[\s,]+/).includes("repo");

        return NextResponse.json({
            repos,
            hasPrivateAccess,
            truncated,
        });

    } catch (error) {
        console.error("Error fetching user repos:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
