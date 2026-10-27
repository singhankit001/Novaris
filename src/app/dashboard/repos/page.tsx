"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { GitFork, Lock, RefreshCw, Search, Star } from "lucide-react";
import PageHeader from "@/components/Dashboard/PageHeader";
import { useApi } from "@/components/Dashboard/use-api";
import { RepoRowDetails } from "@/components/app-fx/RepoRowDetails";
import { Badge } from "@/components/nv/badge";
import { Button } from "@/components/nv/button";
import { DataRow } from "@/components/nv/data";
import { Input } from "@/components/nv/field";
import { Notice } from "@/components/nv/notice";
import { LoadingRegion, Skeleton } from "@/components/nv/skeleton";
import { EmptyState, ErrorState, UnauthorizedState } from "@/components/nv/states";

interface Repo {
    name: string;
    full_name: string;
    private: boolean;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
}

interface ReposResponse {
    repos?: Repo[];
    hasPrivateAccess?: boolean;
}

function grantRepositoryAccess() {
    signIn("github", { callbackUrl: "/dashboard/repos" }, { scope: "read:user user:email repo" });
}

function ReposSkeleton() {
    return (
        <LoadingRegion label="Loading your repositories" className="nv-card">
            {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b border-nv-graphite-700 p-4 last:border-0">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-56 max-w-full" />
                        <Skeleton className="h-3 w-80 max-w-full" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                </div>
            ))}
        </LoadingRegion>
    );
}

export default function MyReposPage() {
    const { data: session, status: sessionStatus } = useSession();
    const { state, retry } = useApi<ReposResponse>("/api/dashboard/user-repos");
    const [query, setQuery] = useState("");

    if (sessionStatus === "unauthenticated" || (sessionStatus === "authenticated" && !session?.user)) {
        return <UnauthorizedState reason="Sign in to list your repositories." />;
    }

    const username = (session?.user as { username?: string } | undefined)?.username;

    let body;
    if (state.status === "loading") {
        body = <ReposSkeleton />;
    } else if (state.status === "unauthorized" && state.code === "GITHUB_TOKEN_MISSING") {
        body = (
            <UnauthorizedState
                title="Repository access is not granted"
                reason="Your session has no GitHub token for repository listing. Grant access to list your repositories. Novaris asks GitHub for the repo scope, which also covers private repositories."
                action={
                    <Button variant="primary" leading={<Lock aria-hidden className="size-4" />} onClick={grantRepositoryAccess}>
                        Grant repository access
                    </Button>
                }
            />
        );
    } else if (state.status === "unauthorized") {
        body = <UnauthorizedState reason="Your session ended. Sign in again to list your repositories." />;
    } else if (state.status === "error") {
        body = (
            <ErrorState
                title="Could not load your repositories"
                detail={state.httpStatus ? `HTTP ${state.httpStatus}` : undefined}
                action={
                    <Button variant="primary" leading={<RefreshCw aria-hidden className="size-4" />} onClick={retry}>
                        Try again
                    </Button>
                }
            >
                <p>{state.message}</p>
            </ErrorState>
        );
    } else {
        const repos = Array.isArray(state.data.repos) ? state.data.repos : [];
        const needle = query.trim().toLowerCase();
        const shown = needle
            ? repos.filter((r) => r.name.toLowerCase().includes(needle) || r.description?.toLowerCase().includes(needle))
            : repos;

        body = (
            <div className="space-y-5">
                {!state.data.hasPrivateAccess && (
                    <Notice
                        tone="info"
                        title="Showing public repositories only"
                        action={
                            <Button leading={<Lock aria-hidden className="size-4" />} onClick={grantRepositoryAccess}>
                                Grant repository access
                            </Button>
                        }
                    >
                        Private repositories appear after you grant the GitHub repo scope.
                    </Notice>
                )}
                <Input
                    label="Filter repositories"
                    hint={`${shown.length} of ${repos.length} shown. Matches name and description.`}
                    leading={<Search className="size-4" />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or description"
                    type="search"
                />
                {shown.length === 0 ? (
                    <EmptyState title={needle ? "No repository matches" : "No repositories found"}>
                        <p>{needle ? "Try a different name or clear the filter." : "GitHub returned no repositories for this account."}</p>
                    </EmptyState>
                ) : (
                    <ul className="nv-fade m-0 list-none overflow-hidden nv-card p-0">
                        {shown.map((repo) => (
                            <li key={repo.full_name}>
                                <DataRow
                                    href={`/chat?q=${encodeURIComponent(repo.full_name)}`}
                                    title={
                                        <span className="flex items-center gap-2">
                                            <span className="truncate">{repo.full_name}</span>
                                            <Badge status={repo.private ? "warning" : "neutral"}>{repo.private ? "Private" : "Public"}</Badge>
                                        </span>
                                    }
                                    meta={repo.description || "No description"}
                                    trailing={
                                        <span className="flex items-center gap-3">
                                            {repo.language && <span className="hidden sm:inline">{repo.language}</span>}
                                            <span className="inline-flex items-center gap-1" title="Stars">
                                                <Star aria-hidden className="size-3.5" />
                                                <span className="sr-only">Stars </span>
                                                {repo.stargazers_count}
                                            </span>
                                            <span className="hidden items-center gap-1 sm:inline-flex" title="Forks">
                                                <GitFork aria-hidden className="size-3.5" />
                                                <span className="sr-only">Forks </span>
                                                {repo.forks_count}
                                            </span>
                                        </span>
                                    }
                                />
                                <RepoRowDetails
                                    fullName={repo.full_name}
                                    description={repo.description}
                                    language={repo.language}
                                    forks={repo.forks_count}
                                    stars={repo.stargazers_count}
                                    updatedAt={repo.updated_at}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Dashboard"
                title="My repositories"
                description={
                    <>
                        {username ? `@${username}. ` : ""}Listed live from GitHub with your own token; nothing on this page is stored by Novaris. Select a repository to open it in chat. See{" "}
                        <Link href="/privacy" className="text-nv-copper-400 underline underline-offset-2">
                            the privacy policy
                        </Link>
                        .
                    </>
                }
            />
            {body}
        </div>
    );
}
