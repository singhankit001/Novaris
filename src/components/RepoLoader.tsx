"use client";

import { useState, useEffect, useReducer } from "react";
import dynamic from "next/dynamic";

const RepoLayout = dynamic(() => import("./RepoLayout").then((mod) => mod.RepoLayout), {
    ssr: false,
});
import { fetchGitHubData } from "@/app/actions";
import type { FileNode, GitHubRepo } from "@/lib/github";
import { JourneyStage } from "@/components/journey/JourneyStage";
import { RepoReveal } from "@/components/journey/RepoReveal";
import { buildTree, summarizeTopLevel } from "@/components/repo-tree";
import {
    REPO_STAGE_LABELS,
    buildRepoScene,
    classifyFailure,
    initialStages,
    stagesReducer,
    type JourneyFailure,
    type RepoFacts,
    type SceneModel,
    type StageEvent,
} from "@/components/journey/model";

interface RepoLoaderProps {
    query: string;
    initialPrompt?: string;
}

interface RepoLoaderData {
    repo: GitHubRepo;
    fileTree: FileNode[];
    hiddenFiles: { path: string; reason: string }[];
    indexStatus?: "ready" | "building";
}

const REPO_LOADER_CACHE_TTL_MS = 15 * 60 * 1000;

function getRepoLoaderCacheKey(query: string): string {
    return `novaris_repo_loader:${query.toLowerCase()}`;
}

function readCachedRepoLoaderData(query: string): RepoLoaderData | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(getRepoLoaderCacheKey(query));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { timestamp?: number; data?: RepoLoaderData };
        if (!parsed?.timestamp || !parsed?.data) return null;
        if (Date.now() - parsed.timestamp > REPO_LOADER_CACHE_TTL_MS) {
            window.sessionStorage.removeItem(getRepoLoaderCacheKey(query));
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}

function writeCachedRepoLoaderData(query: string, data: RepoLoaderData): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(
            getRepoLoaderCacheKey(query),
            JSON.stringify({ timestamp: Date.now(), data })
        );
    } catch {
        // Ignore storage errors to keep loading resilient.
    }
}

function getErrorMessage(error: unknown): string {
    if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
        return (error as { message: string }).message;
    }
    return "Unknown error";
}

/** Facts counted from the data GitHub returned; the same function serves live and cached results. */
function repoFacts(data: RepoLoaderData): RepoFacts {
    const folders = summarizeTopLevel(buildTree(data.fileTree)).directories.length;
    return {
        fetch: { stars: data.repo.stargazers_count, forks: data.repo.forks_count, branch: data.repo.default_branch, language: data.repo.language },
        structure: { files: data.fileTree.filter((f) => f.type !== "tree").length, folders, hidden: data.hiddenFiles.length },
        index: { ready: data.indexStatus === "ready" },
    };
}

export function RepoLoader({ query, initialPrompt }: RepoLoaderProps) {
    const [stages, dispatch] = useReducer(stagesReducer<RepoFacts>, undefined, () => initialStages<RepoFacts>(REPO_STAGE_LABELS));
    const [repoData, setRepoData] = useState<RepoLoaderData | null>(null);
    const [model, setModel] = useState<SceneModel | null>(null);
    const [failure, setFailure] = useState<JourneyFailure | null>(null);
    const [cached, setCached] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [handoff, setHandoff] = useState<"running" | "fading" | "gone">("running");
    const [chatOpen, setChatOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const send = (ev: StageEvent<RepoFacts>) => {
            if (!cancelled) dispatch(ev);
        };
        const settle = (data: RepoLoaderData) => {
            const facts = repoFacts(data);
            (Object.keys(facts) as (keyof RepoFacts)[]).forEach((id) => send({ type: "done", id, facts: facts[id] } as StageEvent<RepoFacts>));
            if (cancelled) return;
            setModel(buildRepoScene(data.repo, data.fileTree));
            setRepoData(data);
        };
        const loadRepo = async () => {
            try {
                const stored = readCachedRepoLoaderData(query);
                if (stored) {
                    setCached(true);
                    settle(stored);
                    return;
                }

                send({ type: "start", id: "fetch" });
                const data = await fetchGitHubData(query);

                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.type !== "repo") {
                    throw new Error("Not a repository");
                }

                const nextData: RepoLoaderData = {
                    repo: data.data as GitHubRepo,
                    fileTree: data.fileTree as FileNode[],
                    hiddenFiles: data.hiddenFiles || [],
                    indexStatus: (data as { indexStatus?: "ready" | "building" }).indexStatus,
                };
                settle(nextData);
                writeCachedRepoLoaderData(query, nextData);
            } catch (err: unknown) {
                console.warn("Repository analysis failed:", err);
                send({ type: "fail", id: "fetch" });
                const rawErrorMessage = getErrorMessage(err);
                const errorMessage = rawErrorMessage === "User not found"
                    ? `GitHub user/org for "${query}" not found`
                    : rawErrorMessage === "Repository not found"
                        ? `Repository "${query}" not found`
                        : rawErrorMessage;
                if (!cancelled) setFailure(classifyFailure(errorMessage));
            }
        };

        void loadRepo();
        return () => {
            cancelled = true;
        };
    }, [query, attempt]);

    const retry = () => {
        dispatch({ type: "reset" });
        setFailure(null);
        setRepoData(null);
        setModel(null);
        setCached(false);
        setAttempt((n) => n + 1);
    };

    const onDone = () => {
        setHandoff("fading");
        window.setTimeout(() => setHandoff("gone"), 700);
    };

    // A prompt carried from the landing page goes straight to the chat; otherwise show the short reveal first.
    const showChat = repoData && handoff !== "running" && (chatOpen || Boolean(initialPrompt));
    const showReveal = repoData && handoff !== "running" && !showChat;

    return (
        <>
            {showChat && (
                <RepoLayout
                    fileTree={repoData.fileTree}
                    repoName={repoData.repo.full_name}
                    owner={repoData.repo.owner.login}
                    repo={repoData.repo.name}
                    hiddenFiles={repoData.hiddenFiles}
                    repoData={repoData.repo}
                    initialPrompt={initialPrompt}
                />
            )}
            {showReveal && (
                <RepoReveal
                    repo={repoData.repo}
                    fileTree={repoData.fileTree}
                    hiddenCount={repoData.hiddenFiles.length}
                    indexReady={repoData.indexStatus === "ready"}
                    onOpenChat={() => setChatOpen(true)}
                />
            )}
            {handoff !== "gone" && (
                <JourneyStage
                    kind="repo"
                    subject={query}
                    stages={stages}
                    model={model}
                    ready={repoData !== null}
                    failure={failure}
                    cached={cached}
                    exiting={handoff === "fading"}
                    onDone={onDone}
                    onRetry={retry}
                />
            )}
        </>
    );
}
