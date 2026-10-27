"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileIcon, FolderIcon } from "./FileIcon";
import { ancestorsOf, buildTree, filterTree, flattenTree, typeAheadIndex, visibleWindow } from "./repo-tree";

const ROW_HEIGHT_TOUCH = 44;
const ROW_HEIGHT_FINE = 34;

function useCoarsePointer(): boolean {
    return useSyncExternalStore(
        (cb) => {
            const mq = window.matchMedia("(pointer: coarse)");
            mq.addEventListener("change", cb);
            return () => mq.removeEventListener("change", cb);
        },
        () => window.matchMedia("(pointer: coarse)").matches,
        () => false,
    );
}

interface RepoFileTreeProps {
    files: { path: string; type?: "blob" | "tree" }[];
    onOpenFile: (path: string) => void;
    className?: string;
}

/**
 * WAI-ARIA tree: roving tabindex, arrows, Home/End, type-ahead, Enter/Space. Rows are windowed so
 * 5000+ files stay cheap; aria-setsize/posinset keep the structure correct for rows that are not in the DOM.
 */
export function RepoFileTree({ files, onOpenFile, className }: RepoFileTreeProps) {
    const uid = useId();
    const ROW_HEIGHT = useCoarsePointer() ? ROW_HEIGHT_TOUCH : ROW_HEIGHT_FINE;
    const tree = buildTree(files);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState("");
    const [focusPath, setFocusPath] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewport, setViewport] = useState(480);
    const scroller = useRef<HTMLDivElement>(null);
    const typed = useRef({ text: "", at: 0 });
    const focusAfterRender = useRef(false);

    const filter = filterTree(tree, query);
    const openSet = filter ? new Set([...expanded, ...filter.open]) : expanded;
    const rows = flattenTree(tree, openSet, filter ? filter.visible : null);
    const fileTotal = files.filter((f) => f.type !== "tree").length;
    const activePath = focusPath && rows.some((r) => r.node.path === focusPath) ? focusPath : (rows[0]?.node.path ?? null);
    const activeIndex = rows.findIndex((r) => r.node.path === activePath);
    const { start, end } = visibleWindow(rows.length, ROW_HEIGHT, scrollTop, viewport);

    useEffect(() => {
        const el = scroller.current;
        if (!el) return;
        const observer = new ResizeObserver(() => setViewport(el.clientHeight));
        observer.observe(el);
        setViewport(el.clientHeight);
        return () => observer.disconnect();
    }, []);

    // Reveal a folder or file named by the chat (inline code buttons dispatch this event).
    useEffect(() => {
        const reveal = (event: Event) => {
            const target = (event as CustomEvent<string>).detail;
            if (!target) return;
            setQuery("");
            setExpanded((prev) => new Set([...prev, ...ancestorsOf(`${target}/x`)]));
            setFocusPath(target);
            setSelected(target);
            focusAfterRender.current = false;
            window.setTimeout(() => {
                const idx = flattenTree(buildTree(files), new Set([...ancestorsOf(`${target}/x`)]), null).findIndex((r) => r.node.path === target);
                if (idx >= 0 && scroller.current) scroller.current.scrollTop = Math.max(0, idx * ROW_HEIGHT - 2 * ROW_HEIGHT);
            }, 60);
        };
        window.addEventListener("reveal-folder", reveal);
        return () => window.removeEventListener("reveal-folder", reveal);
    }, [files, ROW_HEIGHT]);

    useEffect(() => {
        if (!focusAfterRender.current || !activePath) return;
        focusAfterRender.current = false;
        scroller.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(activePath)}"]`)?.focus();
    });

    function moveTo(index: number) {
        const row = rows[Math.max(0, Math.min(rows.length - 1, index))];
        if (!row) return;
        setFocusPath(row.node.path);
        focusAfterRender.current = true;
        const el = scroller.current;
        if (el) {
            const top = rows.indexOf(row) * ROW_HEIGHT;
            if (top < el.scrollTop) el.scrollTop = top;
            else if (top + ROW_HEIGHT > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_HEIGHT - el.clientHeight;
        }
    }

    const toggle = (path: string, open?: boolean) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (open === undefined ? next.has(path) : !open) next.delete(path);
            else next.add(path);
            return next;
        });

    const activate = (path: string, isFolder: boolean) => {
        setFocusPath(path);
        setSelected(path);
        if (isFolder) toggle(path);
        else onOpenFile(path);
    };

    function onKeyDown(e: React.KeyboardEvent) {
        const row = rows[activeIndex];
        if (!row) return;
        const isFolder = row.node.type === "tree";
        const open = openSet.has(row.node.path);
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); return moveTo(activeIndex + 1);
            case "ArrowUp": e.preventDefault(); return moveTo(activeIndex - 1);
            case "Home": e.preventDefault(); return moveTo(0);
            case "End": e.preventDefault(); return moveTo(rows.length - 1);
            case "ArrowRight":
                e.preventDefault();
                if (isFolder && !open) toggle(row.node.path, true);
                else if (isFolder && open) moveTo(activeIndex + 1);
                return;
            case "ArrowLeft":
                e.preventDefault();
                if (isFolder && open && !filter) toggle(row.node.path, false);
                else if (row.parentPath) moveTo(rows.findIndex((r) => r.node.path === row.parentPath));
                return;
            case "Enter":
            case " ":
                e.preventDefault();
                return activate(row.node.path, isFolder);
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const now = e.timeStamp;
            typed.current = { text: now - typed.current.at > 700 ? e.key : typed.current.text + e.key, at: now };
            const hit = typeAheadIndex(rows, typed.current.text.length > 1 ? activeIndex - 1 : activeIndex, typed.current.text);
            if (hit >= 0) moveTo(hit);
        }
    }

    const status = filter ? `${filter.matches} of ${fileTotal} files match` : `${fileTotal.toLocaleString()} files`;

    return (
        <div className={cn("flex min-h-0 flex-col", className)}>
            <div className="border-b border-nv-graphite-700 p-2">
                <label htmlFor={`${uid}-filter`} className="sr-only">Filter files by path</label>
                <div className="relative">
                    <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nv-ivory-300" />
                    <input
                        id={`${uid}-filter`}
                        type="search"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setScrollTop(0); if (scroller.current) scroller.current.scrollTop = 0; }}
                        placeholder="Filter files"
                        className="min-h-11 w-full rounded-full border border-nv-graphite-600 bg-nv-graphite-850 pl-9 pr-3 text-nv-small text-nv-ivory-100 transition-colors placeholder:text-nv-graphite-400 focus:border-nv-copper-400 focus:bg-white [@media(pointer:fine)]:min-h-9"
                    />
                </div>
                <p role="status" aria-live="polite" className="nv-num mt-1.5 px-1 text-nv-micro text-nv-ivory-300">{status}</p>
            </div>

            {rows.length === 0 ? (
                <p className="p-4 text-nv-small text-nv-ivory-300">{filter ? "No file path contains that text." : "This repository has no files we can show."}</p>
            ) : (
                <div ref={scroller} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} className="min-h-0 flex-1 overflow-auto">
                    <div role="tree" aria-label="Repository files" aria-multiselectable="false" onKeyDown={onKeyDown} style={{ height: rows.length * ROW_HEIGHT, position: "relative" }}>
                        {rows.slice(start, end).map((row, i) => {
                            const index = start + i;
                            const { node } = row;
                            const isFolder = node.type === "tree";
                            const open = openSet.has(node.path);
                            const isActive = node.path === activePath;
                            return (
                                <div
                                    key={node.path}
                                    role="treeitem"
                                    data-path={node.path}
                                    aria-level={row.depth + 1}
                                    aria-setsize={row.setSize}
                                    aria-posinset={row.posInSet}
                                    aria-expanded={isFolder ? open : undefined}
                                    aria-selected={selected === node.path}
                                    tabIndex={isActive ? 0 : -1}
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", node.path); e.dataTransfer.effectAllowed = "copy"; }}
                                    onClick={() => activate(node.path, isFolder)}
                                    onFocus={() => setFocusPath(node.path)}
                                    style={{ position: "absolute", top: index * ROW_HEIGHT, height: ROW_HEIGHT, left: 0, right: 0, paddingLeft: 8 + row.depth * 14 }}
                                    className={cn(
                                        "flex cursor-pointer select-none items-center gap-1.5 pr-3 text-nv-small text-nv-ivory-200 transition-colors hover:bg-nv-graphite-800",
                                        selected === node.path && "bg-nv-copper-wash font-medium text-nv-ivory-50 shadow-[inset_2px_0_0_var(--nv-copper-400)]",
                                    )}
                                    title={node.path}
                                >
                                    {isFolder ? (open ? <ChevronDown aria-hidden className="size-3.5 shrink-0 text-nv-ivory-300" /> : <ChevronRight aria-hidden className="size-3.5 shrink-0 text-nv-ivory-300" />) : <span aria-hidden className="w-3.5 shrink-0" />}
                                    {isFolder ? <FolderIcon name={node.name} isExpanded={open} /> : <FileIcon filename={node.name} />}
                                    <span className="min-w-0 flex-1 truncate">{node.name}</span>
                                    {isFolder && <span className="nv-num text-nv-micro text-nv-ivory-300">{node.fileCount.toLocaleString()}<span className="sr-only"> files</span></span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
