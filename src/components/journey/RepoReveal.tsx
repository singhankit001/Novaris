"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowRight, GitBranch, GitFork, Star } from "lucide-react";
import type { FileNode, GitHubRepo } from "@/lib/github";
import { Button } from "@/components/nv/button";
import { RepoStructure } from "@/components/RepoStructure";
import { buildTree, summarizeTopLevel } from "@/components/repo-tree";
import s from "./workspace.module.css";

export interface RepoRevealProps {
    repo: GitHubRepo;
    fileTree: FileNode[];
    hiddenCount: number;
    indexReady: boolean;
    /** Slot for the interactive codebase map; wired at integration. */
    codemapSlot?: ReactNode;
    onOpenChat: () => void;
}

const num = (v: number) => v.toLocaleString("en-US");

export function RepoReveal({ repo, fileTree, hiddenCount, indexReady, codemapSlot, onOpenChat }: RepoRevealProps) {
    const cta = useRef<HTMLButtonElement>(null);
    useEffect(() => cta.current?.focus({ preventScroll: true }), []);
    const files = fileTree.filter((f) => f.type !== "tree").length;
    const { directories } = summarizeTopLevel(buildTree(fileTree));
    const facts: { label: string; value: string }[] = [
        { label: "Files", value: num(files) },
        { label: "Top-level folders", value: num(directories.length) },
        { label: "Primary language", value: repo.language ?? "Not reported" },
        { label: "Default branch", value: repo.default_branch },
    ];
    return (
        <div className={s.root} data-workspace="repo">
            <div className={`${s.atmosphere} nv-aurora`} aria-hidden />
            <header className={s.actionBar}>
                <span className="nv-eyebrow">Novaris · Repository intelligence</span>
                <Button ref={cta} variant="primary" size="lg" onClick={onOpenChat} trailing={<ArrowRight className="size-4" aria-hidden />} data-testid="open-chat">
                    Open chat
                </Button>
            </header>
            <main className={s.main}>
                <section className={`${s.hero} nv-rise`} aria-labelledby="rv-title">
                    <div className="min-w-0">
                        <p className="nv-eyebrow">{repo.owner.login}</p>
                        <h1 id="rv-title" className="nv-display mt-1 break-words text-nv-display-lg">
                            <span className="nv-gradient-text">{repo.name}</span>
                        </h1>
                        {repo.description && <p className="mt-3 max-w-[var(--nv-measure)] text-nv-lead text-nv-ivory-200 text-pretty">{repo.description}</p>}
                        <p className="nv-num mt-3 flex flex-wrap gap-x-5 gap-y-1 text-nv-small text-nv-ivory-200">
                            <span className="inline-flex items-center gap-1">
                                <Star className="size-3.5" aria-hidden /> {num(repo.stargazers_count)} stars
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <GitFork className="size-3.5" aria-hidden /> {num(repo.forks_count)} forks
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <GitBranch className="size-3.5" aria-hidden /> {indexReady ? "Search index ready" : "Search index building in the background"}
                            </span>
                        </p>
                    </div>
                </section>
                <dl className={`${s.metrics} nv-rise`} style={{ animationDelay: "70ms" }} aria-label="Repository facts">
                    {facts.map((f) => (
                        <div key={f.label} className={s.metric}>
                            <dt className="nv-eyebrow">{f.label}</dt>
                            <dd className="nv-display nv-num break-words">{f.value}</dd>
                        </div>
                    ))}
                </dl>
                {files === 0 && (
                    <p className={`${s.empty} text-nv-body text-nv-ivory-200`}>GitHub returned no files for this repository. You can still open the chat and ask about it.</p>
                )}
                <div data-slot="codemap" className={s.codemapSlot}>
                    {codemapSlot}
                </div>
                {files > 0 && <RepoStructure files={fileTree} hiddenCount={hiddenCount} />}
            </main>
            <div className={s.askDock}>
                <Button variant="primary" size="lg" onClick={onOpenChat} className="w-full" trailing={<ArrowRight className="size-4" aria-hidden />}>
                    Open chat
                </Button>
            </div>
        </div>
    );
}
