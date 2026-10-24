import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, GitFork, Star } from "lucide-react";
import { getStarredRepos } from "@/lib/github";
import { buildInvalidSessionSignOutRedirect, getSessionAuthState } from "@/lib/session-guard";
import PageHeader from "@/components/Dashboard/PageHeader";
import { DataRow } from "@/components/nv/data";
import { Notice } from "@/components/nv/notice";
import { EmptyState, ErrorState } from "@/components/nv/states";
import { buttonClasses } from "@/components/nv/button-styles";

export default async function StarredPage() {
    const session = await auth();
    const authState = getSessionAuthState(session);

    if (authState === "unauthenticated") {
        redirect("/");
    }
    if (authState === "invalid") {
        redirect(buildInvalidSessionSignOutRedirect());
    }

    const user = session?.user;
    if (!user) {
        redirect("/");
    }

    // Only the GitHub login is a valid lookup key; display names and email prefixes are not.
    const username = user.username;
    const result = username
        ? await getStarredRepos(username)
        : ({ status: "error", reason: "unauthorized", message: "Your session has no GitHub username. Sign out and sign in again." } as const);
    const starredRepos = result.status === "ok" ? result.repos : [];

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Dashboard"
                title="Starred repositories"
                description={username ? `Public repositories starred by @${username}.` : "Public repositories you starred on GitHub."}
                actions={
                    username ? (
                        <a
                            href={`https://github.com/${username}?tab=stars`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonClasses("secondary")}
                        >
                            View on GitHub
                            <ExternalLink aria-hidden className="size-4" />
                        </a>
                    ) : undefined
                }
            />

            {result.status === "error" ? (
                <ErrorState
                    title="Could not load your starred repositories"
                    detail={`reason: ${result.reason}`}
                    action={
                        <Link href="/dashboard/starred" className={buttonClasses("primary")}>
                            Try again
                        </Link>
                    }
                >
                    <p>{result.message}</p>
                </ErrorState>
            ) : starredRepos.length === 0 ? (
                <EmptyState title="No public stars found">
                    <p>GitHub reports no public starred repositories for @{username}. Stars you add on GitHub appear here.</p>
                </EmptyState>
            ) : (
                <div className="space-y-4">
                    {result.status === "ok" && result.truncated && (
                        <Notice tone="info" title={`Showing your ${starredRepos.length} most recent stars`}>
                            Older stars are not listed. See the rest on GitHub.
                        </Notice>
                    )}
                    <ul className="m-0 list-none overflow-hidden rounded-2xl border border-nv-graphite-700 bg-nv-graphite-900 p-0">
                        {starredRepos.map((repo) => (
                            <li key={repo.full_name}>
                                <DataRow
                                    href={`/chat?q=${encodeURIComponent(repo.full_name)}`}
                                    title={repo.full_name}
                                    meta={repo.description || "No description"}
                                    trailing={
                                        <span className="flex items-center gap-3">
                                            {repo.language && <span className="hidden sm:inline">{repo.language}</span>}
                                            <span className="inline-flex items-center gap-1">
                                                <Star aria-hidden className="size-3.5" />
                                                <span className="sr-only">Stars </span>
                                                {repo.stargazers_count}
                                            </span>
                                            <span className="hidden items-center gap-1 sm:inline-flex">
                                                <GitFork aria-hidden className="size-3.5" />
                                                <span className="sr-only">Forks </span>
                                                {repo.forks_count}
                                            </span>
                                        </span>
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
