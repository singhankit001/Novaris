"use client";

import { useState, useSyncExternalStore } from "react";
import { EyeOff } from "lucide-react";
import { Dialog, Drawer } from "@/components/nv/dialog";
import { Button } from "@/components/nv/button";
import type { FileNode, GitHubRepo } from "@/lib/github";
import { RepoFileTree } from "./RepoFileTree";

interface RepoSidebarProps {
    fileTree: FileNode[];
    repoName: string;
    isOpen: boolean;
    onClose: () => void;
    onFileDoubleClick?: (filePath: string) => void;
    hiddenFiles?: { path: string; reason: string }[];
    repoData?: GitHubRepo;
    /** Desktop only: hides the explorer column. The mobile sheet uses isOpen. */
    collapsed?: boolean;
}

function useIsDesktop(): boolean {
    return useSyncExternalStore(
        (cb) => {
            const mq = window.matchMedia("(min-width: 1024px)");
            mq.addEventListener("change", cb);
            return () => mq.removeEventListener("change", cb);
        },
        () => window.matchMedia("(min-width: 1024px)").matches,
        () => true,
    );
}

export function RepoSidebar({ fileTree, repoName, isOpen, onClose, onFileDoubleClick, hiddenFiles = [], repoData, collapsed = false }: RepoSidebarProps) {
    const desktop = useIsDesktop();
    const [showHidden, setShowHidden] = useState(false);

    const body = (
        <div className="flex h-full min-h-0 flex-col">
            {repoData?.description && <p className="m-0 line-clamp-3 border-b border-nv-graphite-700 px-4 py-3 text-nv-small leading-snug text-nv-ivory-200">{repoData.description}</p>}
            <RepoFileTree files={fileTree} onOpenFile={(p) => onFileDoubleClick?.(p)} className="flex-1" />
            {hiddenFiles.length > 0 && (
                <div className="border-t border-nv-graphite-700 p-2">
                    <Button variant="ghost" className="w-full justify-start text-nv-small" onClick={() => setShowHidden(true)} leading={<EyeOff aria-hidden className="size-4" />}>
                        {hiddenFiles.length.toLocaleString()} paths left out
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <>
            {desktop ? (
                !collapsed && (
                    <nav aria-label={`Files in ${repoName}`} className="nv-fade hidden h-full w-72 shrink-0 border-r border-nv-graphite-700 bg-white/70 lg:block">
                        {body}
                    </nav>
                )
            ) : (
                <Drawer open={isOpen} onClose={onClose} title="Files" description={repoName} side="right" className="!mr-auto !ml-0">
                    {body}
                </Drawer>
            )}
            <Dialog open={showHidden} onClose={() => setShowHidden(false)} title="Paths left out of the tree" description="Dependencies, build output and binary assets are skipped so the tree stays usable and answers stay focused.">
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {hiddenFiles.map((f) => (
                        <li key={f.path} className="flex items-start justify-between gap-4 rounded-nv-sm border border-nv-graphite-700 p-2 text-nv-small">
                            <span className="break-all font-mono text-nv-ivory-100">{f.path}</span>
                            <span className="shrink-0 text-nv-ivory-300">{f.reason}</span>
                        </li>
                    ))}
                </ul>
            </Dialog>
        </>
    );
}
