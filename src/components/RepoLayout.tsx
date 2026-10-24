"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, FolderTree, GitFork, MessageSquareText, Network, PanelLeft, Star } from "lucide-react";
import { RepoSidebar } from "./RepoSidebar";
import { ChatInterface } from "./ChatInterface";
import { FilePreview } from "./FilePreview";
import { RepoStructure } from "./RepoStructure";
import { cn } from "@/lib/utils";
import type { FileNode, GitHubRepo } from "@/lib/github";
import s from "./chat/chat.module.css";

interface RepoLayoutProps {
    fileTree: FileNode[];
    repoName: string;
    owner: string;
    repo: string;
    hiddenFiles?: { path: string; reason: string }[];
    repoData: GitHubRepo;
    initialPrompt?: string;
}

type View = "chat" | "structure";
interface PreviewTarget {
    path: string;
    lines?: string;
}

const PANEL_MIN = 360;
const PANEL_MAX = 760;

function useMinWidth(px: number): boolean {
    return useSyncExternalStore(
        (cb) => {
            const mq = window.matchMedia(`(min-width: ${px}px)`);
            mq.addEventListener("change", cb);
            return () => mq.removeEventListener("change", cb);
        },
        () => window.matchMedia(`(min-width: ${px}px)`).matches,
        () => true,
    );
}

function timeAgo(iso: string): string {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (!Number.isFinite(days) || days < 0) return "recently";
    if (days < 1) return "today";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

export function RepoLayout({ fileTree, repoName, owner, repo, hiddenFiles = [], repoData, initialPrompt }: RepoLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [explorerOpen, setExplorerOpen] = useState(true);
    const [preview, setPreview] = useState<PreviewTarget | null>(null);
    const [view, setView] = useState<View>("chat");
    const [panelWidth, setPanelWidth] = useState(500);
    const wide = useMinWidth(1280);
    const drag = useRef<{ x: number; w: number } | null>(null);

    const openFile = (path: string, lines?: string) => setPreview({ path, lines });
    /** Starts a question about a file: back to the conversation, composer prefilled. */
    const askAboutFile = (path: string) => {
        setView("chat");
        window.dispatchEvent(new CustomEvent("prefill-composer", { detail: `Explain ${path}` }));
    };

    useEffect(() => {
        const open = (event: Event) => {
            const detail = (event as CustomEvent<string | PreviewTarget>).detail;
            if (typeof detail === "string") setPreview({ path: detail });
            else if (detail && typeof detail.path === "string") setPreview({ path: detail.path, lines: detail.lines });
        };
        const reveal = () => {
            setSidebarOpen(true);
            setExplorerOpen(true);
        };
        window.addEventListener("open-file-preview", open);
        window.addEventListener("reveal-folder", reveal);
        return () => {
            window.removeEventListener("open-file-preview", open);
            window.removeEventListener("reveal-folder", reveal);
        };
    }, []);

    const tab = (id: View, label: string, icon: React.ReactNode) => (
        <button
            type="button"
            role="tab"
            id={`repo-tab-${id}`}
            aria-label={label}
            aria-selected={view === id}
            aria-controls={`repo-panel-${id}`}
            tabIndex={view === id ? 0 : -1}
            onClick={() => setView(id)}
            onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next: View = id === "chat" ? "structure" : "chat";
                    setView(next);
                    document.getElementById(`repo-tab-${next}`)?.focus();
                }
            }}
            className={cn(
                "inline-flex min-h-9 touch-manipulation items-center gap-2 rounded-full px-3.5 text-nv-small font-medium transition-[background-color,color,box-shadow] duration-150 [@media(pointer:coarse)]:min-h-11",
                view === id ? "bg-white text-nv-ivory-50 shadow-nv-xs" : "text-nv-ivory-200 hover:text-nv-ivory-50",
            )}
        >
            <span aria-hidden className={view === id ? "text-nv-copper-400" : undefined}>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    const onHandleKey = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") setPanelWidth((w) => Math.min(PANEL_MAX, w + 24));
        if (e.key === "ArrowRight") setPanelWidth((w) => Math.max(PANEL_MIN, w - 24));
    };

    return (
        <>
            <div className="nv-repo-workspace flex h-dvh w-full flex-col overflow-hidden bg-nv-graphite-950">
                <header className={`${s.glass} relative z-30 flex min-h-16 shrink-0 items-center gap-2 border-b border-nv-graphite-700 px-2 sm:gap-3 sm:px-4`}>
                    <Link href="/" aria-label="Back to home" className="grid size-11 shrink-0 place-items-center rounded-nv-sm text-nv-ivory-200 transition-colors hover:bg-nv-graphite-850 hover:text-nv-ivory-50">
                        <ArrowLeft aria-hidden className="size-5" />
                    </Link>
                    <button
                        type="button"
                        onClick={() => (window.matchMedia("(min-width: 1024px)").matches ?setExplorerOpen((v) => !v) : setSidebarOpen(true))}
                        aria-label={explorerOpen ? "Hide file explorer" : "Show file explorer"}
                        aria-pressed={explorerOpen}
                        className={cn("grid size-11 shrink-0 place-items-center rounded-nv-sm transition-colors hover:bg-nv-graphite-850", explorerOpen ? "text-nv-copper-400" : "text-nv-ivory-200")}
                    >
                        <PanelLeft aria-hidden className="hidden size-5 lg:block" />
                        <FolderTree aria-hidden className="size-5 lg:hidden" />
                    </button>

                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        {/* GitHub owner avatars load straight from GitHub. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://github.com/${owner}.png?size=72`} alt="" width={32} height={32} className="hidden size-8 shrink-0 rounded-lg border border-white shadow-nv-card sm:block" />
                        <div className="min-w-0">
                            <h1 className="m-0 flex min-w-0 items-baseline gap-1 font-nv-sans text-[0.9375rem] font-semibold leading-tight tracking-[-0.02em]">
                                <span className="hidden truncate text-nv-ivory-300 sm:inline">{owner}</span>
                                <span aria-hidden className="hidden text-nv-graphite-500 sm:inline">/</span>
                                <span className="truncate text-nv-ivory-50">{repo}</span>
                            </h1>
                            <p className="nv-num m-0 mt-0.5 flex items-center gap-x-3 whitespace-nowrap text-nv-micro text-nv-ivory-300">
                                <span className="inline-flex items-center gap-1"><Star aria-hidden className="size-3" />{repoData.stargazers_count.toLocaleString()}<span className="sr-only"> stars</span></span>
                                <span className="hidden items-center gap-1 sm:inline-flex"><GitFork aria-hidden className="size-3" />{repoData.forks_count.toLocaleString()}<span className="sr-only"> forks</span></span>
                                {repoData.language && <span className="hidden items-center gap-1.5 sm:inline-flex"><span aria-hidden className="size-1.5 rounded-full bg-nv-violet-400" />{repoData.language}</span>}
                                <span className="inline-flex items-center gap-1"><Clock aria-hidden className="size-3" />Updated {timeAgo(repoData.updated_at)}</span>
                            </p>
                        </div>
                    </div>

                    <div role="tablist" aria-label="Workspace view" className="inline-flex shrink-0 rounded-full border border-nv-graphite-700 bg-nv-graphite-850 p-0.5 shadow-[inset_0_1px_2px_rgb(21_23_29/0.05)]">
                        {tab("chat", "Conversation", <MessageSquareText className="size-4" />)}
                        {tab("structure", "Repository structure", <Network className="size-4" />)}
                    </div>
                </header>

                <div className="flex min-h-0 flex-1">
                    <RepoSidebar
                        fileTree={fileTree}
                        repoName={repoName}
                        isOpen={sidebarOpen}
                        collapsed={!explorerOpen}
                        onClose={() => setSidebarOpen(false)}
                        onFileDoubleClick={(p) => {
                            openFile(p);
                            setSidebarOpen(false);
                        }}
                        hiddenFiles={hiddenFiles}
                        repoData={repoData}
                    />
                    <main className="flex h-full min-w-0 flex-1 flex-col">
                        <div id="repo-panel-chat" role="tabpanel" aria-labelledby="repo-tab-chat" hidden={view !== "chat"} className="min-h-0 flex-1">
                            <ChatInterface repoContext={{ owner, repo, fileTree }} initialPrompt={initialPrompt} />
                        </div>
                        <div id="repo-panel-structure" role="tabpanel" aria-labelledby="repo-tab-structure" hidden={view !== "structure"} className="min-h-0 flex-1">
                            {/* Mount point for the interactive codebase map: openFile and askAboutFile are its callbacks. */}
                            <div data-slot="codemap" className="h-full min-h-0 overflow-auto bg-nv-graphite-950 p-4 md:p-6">
                                <RepoStructure files={fileTree} hiddenCount={hiddenFiles.length} />
                            </div>
                        </div>
                    </main>

                    {wide && preview && (
                        <>
                            <div
                                role="separator"
                                aria-orientation="vertical"
                                aria-label="Resize file preview"
                                aria-valuemin={PANEL_MIN}
                                aria-valuemax={PANEL_MAX}
                                aria-valuenow={panelWidth}
                                tabIndex={0}
                                onKeyDown={onHandleKey}
                                onPointerDown={(e) => {
                                    e.currentTarget.setPointerCapture(e.pointerId);
                                    drag.current = { x: e.clientX, w: panelWidth };
                                }}
                                onPointerMove={(e) => {
                                    if (drag.current) setPanelWidth(Math.min(PANEL_MAX, Math.max(PANEL_MIN, drag.current.w + (drag.current.x - e.clientX))));
                                }}
                                onPointerUp={() => {
                                    drag.current = null;
                                }}
                                onPointerCancel={() => {
                                    drag.current = null;
                                }}
                                className="group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize touch-none"
                            >
                                <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-nv-graphite-700 transition-colors group-hover:bg-nv-copper-400 group-focus-visible:bg-nv-copper-400" />
                            </div>
                            <div style={{ width: panelWidth }} className="h-full min-h-0 shrink-0 shadow-[-18px_0_40px_-32px_rgb(21_23_29/0.35)]">
                                <FilePreview variant="panel" isOpen filePath={preview.path} lines={preview.lines} repoOwner={owner} repoName={repo} onClose={() => setPreview(null)} onAsk={askAboutFile} />
                            </div>
                        </>
                    )}
                </div>
            </div>
            {!wide && <FilePreview isOpen={preview !== null} filePath={preview?.path ?? null} lines={preview?.lines} repoOwner={owner} repoName={repo} onClose={() => setPreview(null)} />}
        </>
    );
}
