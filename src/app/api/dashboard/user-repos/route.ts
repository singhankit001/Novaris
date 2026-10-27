import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getInvalidSessionApiError, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";
import { getSessionGitHubAuth } from "@/lib/github-api";

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
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
            cache: "no-store", // per-user response; must not enter the shared data cache
        });

        if (!res.ok) {
            console.error("GitHub API error fetching user repos", await res.text());
            return NextResponse.json({ error: "Failed to fetch repositories" }, { status: res.status });
        }

        const data: unknown = await res.json();
        const repos = Array.isArray(data) ? data : [];

        // Private repositories are only listed when the user granted the `repo` OAuth scope.
        const hasPrivateAccess = (scope ?? "").split(/[\s,]+/).includes("repo");

        return NextResponse.json({
            repos,
            hasPrivateAccess,
        });

    } catch (error) {
        console.error("Error fetching user repos:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
