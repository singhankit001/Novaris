"use client";

import { ArchitectureGraph, type ArchEdge, type ArchNode } from "@/components/fx/graph/architecture-graph";

const MAX_DIRS = 8;
const ROW = 100;

/**
 * Containment map: repository root to its largest top-level directories. Edges mean "contains" only.
 * Built from the file tree already fetched; no import or dependency data exists for it, so none is drawn.
 */
export function StructureMap({ directories }: { directories: { name: string; fileCount: number }[] }) {
    const shown = directories.slice(0, MAX_DIRS);
    if (shown.length === 0) return null;
    const mid = ((shown.length - 1) * ROW) / 2;
    const nodes: ArchNode[] = [
        { id: "root", label: "Repository root", kind: "module", x: 0, y: mid, detail: `${directories.length} top-level directories` },
        ...shown.map((d, i) => ({ id: `dir:${d.name}`, label: `${d.name}/`, kind: "module" as const, x: 320, y: i * ROW, detail: `${d.fileCount.toLocaleString()} files` })),
    ];
    const edges: ArchEdge[] = shown.map((d) => ({ id: `e:${d.name}`, from: "root", to: `dir:${d.name}` }));
    return (
        <div className="space-y-2">
            <ArchitectureGraph nodes={nodes} edges={edges} label="Repository directory map" height={Math.min(460, shown.length * ROW + 60)} />
            <p className="m-0 text-nv-micro text-nv-ivory-300">Shows which directories contain which files. It is not an import or dependency graph; none was analysed.</p>
        </div>
    );
}
