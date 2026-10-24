"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GitBranch, Loader2, CheckCircle2, FileCode, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

const RepoLayout = dynamic(() => import("./RepoLayout").then((mod) => mod.RepoLayout), {
    ssr: false,
});
import { fetchGitHubData } from "@/app/actions";
import type { FileNode, GitHubRepo } from "@/lib/github";
import Link from "next/link";

interface LoadingStep {
    id: string;
    message: string;
    status: "loading" | "complete" | "error";
}

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

export function RepoLoader({ query, initialPrompt }: RepoLoaderProps) {
    const reduceMotion = useReducedMotion();
    const [steps, setSteps] = useState<LoadingStep[]>([]);
    const [repoData, setRepoData] = useState<RepoLoaderData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const updateStep = (id: string, status: "loading" | "complete" | "error", message?: string) => {
        setSteps((prev) => {
            const existing = prev.find((s) => s.id === id);
            if (existing) {
                return prev.map((s) =>
                    s.id === id ? { ...s, status, message: message || s.message } : s
                );
            }
            return [...prev, { id, message: message || "", status }];
        });
    };

    useEffect(() => {
        const loadRepo = async () => {
            try {
                const cached = readCachedRepoLoaderData(query);
                if (cached) {
                    setRepoData(cached);
                    return;
                }

                // Step 1: Fetch repo data
                updateStep("fetch", "loading", `Fetching repository ${query}...`);
                const data = await fetchGitHubData(query);

                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.type !== "repo") {
                    throw new Error("Not a repository");
                }

                const repo = data.data as GitHubRepo;
                const fileTree = data.fileTree as FileNode[];
                const hiddenFiles = data.hiddenFiles || [];
                const indexStatus = (data as { indexStatus?: "ready" | "building" }).indexStatus;

                updateStep("fetch", "complete", "Repository data fetched");

                // Step 2: Indexing status
                updateStep("index", "loading", "Indexing repository for fast file search...");
                if (indexStatus === "ready") {
                    updateStep("index", "complete", "Indexed tree ready for instant file selection");
                } else {
                    updateStep("index", "complete", "Indexing queued in background");
                }

                // Step 3: Analyze structure
                updateStep("analyze", "loading", `Analyzing ${fileTree.length} files...`);
                updateStep("analyze", "complete", "File structure analyzed");

                // Step 4: Prepare environment
                updateStep("env", "loading", "Preparing chat environment...");
                updateStep("env", "complete", "Ready to chat");

                const nextData = { repo, fileTree, hiddenFiles, indexStatus };
                setRepoData(nextData);
                writeCachedRepoLoaderData(query, nextData);

            } catch (err: unknown) {
                console.error(err);
                const rawErrorMessage = getErrorMessage(err);
                const errorMessage = rawErrorMessage === "User not found"
                    ? `GitHub user/org for "${query}" not found`
                    : rawErrorMessage === "Repository not found"
                        ? `Repository "${query}" not found`
                        : rawErrorMessage;

                setError(errorMessage);
                updateStep("error", "error", errorMessage);
            }
        };

        void loadRepo();
    }, [query]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-nv-graphite-950 text-nv-ivory-50 gap-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
                <h1 className="text-2xl font-bold">Repository unavailable</h1>
                <p className="text-nv-ivory-300">{error}</p>
                <Link href="/" className="mt-4 px-6 py-3 bg-nv-graphite-900 text-nv-ivory-50 rounded-lg hover:bg-nv-graphite-800 transition-colors">
                    Back to Home
                </Link>
            </div>
        );
    }

    if (!repoData) {
        return (
            <div className="nv-analysis-loader flex items-center justify-center min-h-screen bg-nv-graphite-950 text-nv-ivory-50 relative z-10">
                <div className="nv-loading-panel max-w-md w-full p-8">
                    <div className="mb-8 text-center">
                        <motion.div
                            initial={reduceMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-4 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-nv-graphite-900 backdrop-blur-xl border border-nv-graphite-700 shadow-sm"
                        >
                            <GitBranch className="w-10 h-10 text-nv-copper-400" />
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-2 text-nv-ivory-50">Opening your repository</h2>
                        <p className="text-sm text-nv-ivory-300">{query}</p>
                    </div>

                    <div role="status" aria-live="polite" className="nv-loading-steps space-y-3">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.id}
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: reduceMotion ? 0 : index * 0.06 }}
                                className="flex items-center gap-3 p-3.5 bg-nv-graphite-900 backdrop-blur-xl border border-nv-graphite-700 rounded-xl shadow-sm"
                            >
                                {step.status === "loading" && (
                                    <Loader2 className="w-5 h-5 text-nv-copper-400 animate-spin motion-reduce:animate-none shrink-0" />
                                )}
                                {step.status === "complete" && (
                                    <CheckCircle2 className="w-5 h-5 text-nv-copper-400 shrink-0" />
                                )}
                                {step.status === "error" && (
                                    <FileCode className="w-5 h-5 text-red-500 shrink-0" />
                                )}
                                <span className="text-sm text-nv-ivory-300">{step.message}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <RepoLayout
            fileTree={repoData.fileTree}
            repoName={repoData.repo.full_name}
            owner={repoData.repo.owner.login}
            repo={repoData.repo.name}
            hiddenFiles={repoData.hiddenFiles}
            repoData={repoData.repo}
            initialPrompt={initialPrompt}
        />
    );
}
