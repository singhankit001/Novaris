"use client";

import { useEffect, useState } from "react";
import { FolderTree } from "lucide-react";
import { RepoSidebar } from "./RepoSidebar";
import { ChatInterface } from "./ChatInterface";
import { FilePreview } from "./FilePreview";
import { RepoStructure } from "./RepoStructure";
import { Button } from "@/components/nv/button";
import type { FileNode, GitHubRepo } from "@/lib/github";

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

export function RepoLayout({ fileTree, repoName, owner, repo, hiddenFiles = [], repoData, initialPrompt }: RepoLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [view, setView] = useState<View>("chat");

    useEffect(() => {
        const open = (event: Event) => setPreviewFile((event as CustomEvent<string>).detail);
        const reveal = () => setSidebarOpen(true);
        window.addEventListener("open-file-preview", open);
        window.addEventListener("reveal-folder", reveal);
        return () => {
            window.removeEventListener("open-file-preview", open);
            window.removeEventListener("reveal-folder", reveal);
        };
    }, []);

    const tab = (id: View, label: string) => (
        <button
            type="button"
            role="tab"
            id={`repo-tab-${id}`}
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
            className={`-mb-px inline-flex min-h-11 touch-manipulation items-center border-b-2 px-3 text-nv-body ${view === id ? "border-nv-copper-400 text-nv-ivory-50" : "border-transparent text-nv-ivory-300 hover:text-nv-ivory-100"}`}
        >
            {label}
        </button>
    );

    return (
        <>
            <div className="nv-repo-workspace flex h-dvh w-full overflow-hidden bg-nv-graphite-950">
                <RepoSidebar
                    fileTree={fileTree}
                    repoName={repoName}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onFileDoubleClick={(p) => {
                        setPreviewFile(p);
                        setSidebarOpen(false);
                    }}
                    hiddenFiles={hiddenFiles}
                    repoData={repoData}
                />
                <div className="flex h-full min-w-0 flex-1 flex-col">
                    <div role="tablist" aria-label="Workspace view" className="flex shrink-0 items-center gap-1 border-b border-nv-graphite-700 bg-nv-graphite-900 px-4">
                        <Button variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(true)} leading={<FolderTree aria-hidden className="size-4" />}>Files</Button>
                        {tab("chat", "Conversation")}
                        {tab("structure", "Repository structure")}
                    </div>
                    <div id="repo-panel-chat" role="tabpanel" aria-labelledby="repo-tab-chat" hidden={view !== "chat"} className="min-h-0 flex-1">
                        <ChatInterface repoContext={{ owner, repo, fileTree }} initialPrompt={initialPrompt} />
                    </div>
                    <div id="repo-panel-structure" role="tabpanel" aria-labelledby="repo-tab-structure" hidden={view !== "structure"} className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
                        <RepoStructure files={fileTree} hiddenCount={hiddenFiles.length} />
                    </div>
                </div>
            </div>
            <FilePreview isOpen={previewFile !== null} filePath={previewFile} repoOwner={owner} repoName={repo} onClose={() => setPreviewFile(null)} />
        </>
    );
}
