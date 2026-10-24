import { BarList } from "@/components/nv/charts";
import { buildTree, summarizeTopLevel } from "./repo-tree";

interface RepoStructureProps {
    files: { path: string; type?: "blob" | "tree" }[];
    hiddenCount: number;
}

/** Top-level directories ranked by file count. Every number is counted from the real file tree. */
export function RepoStructure({ files, hiddenCount }: RepoStructureProps) {
    const fileTotal = files.filter((f) => f.type !== "tree").length;
    const { directories, rootFiles } = summarizeTopLevel(buildTree(files));
    const items = directories.slice(0, 16).map((d) => ({ label: `${d.name}/`, value: d.fileCount, display: d.fileCount.toLocaleString() }));
    if (rootFiles > 0) items.push({ label: "(repository root)", value: rootFiles, display: rootFiles.toLocaleString() });
    const omitted = directories.length - 16;

    return (
        <section aria-label="Repository structure" className="nv-holo-ring relative overflow-hidden rounded-nv-xl bg-nv-graphite-900 p-5 shadow-nv-card md:p-7">
            <div aria-hidden className="nv-aurora pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70" />
            <p className="nv-eyebrow relative">Structure · from repository data</p>
            <h2 className="nv-display relative mt-1 text-nv-display-md">Where the files are</h2>
            <p className="relative mt-2 max-w-[var(--nv-measure)] text-nv-small text-nv-ivory-200">
                Top-level directories ranked by file count. Counted from the file tree GitHub returned: <span className="nv-num">{fileTotal.toLocaleString()}</span> files
                {hiddenCount > 0 ? `, with ${hiddenCount.toLocaleString()} paths such as dependencies and build output left out` : ""}. File counts say nothing about code quality or importance.
            </p>
            <div className="relative mt-5">
                {items.length > 0 ? <BarList caption="Files per top-level directory" items={items} /> : <p className="text-nv-small text-nv-ivory-300">No files to chart.</p>}
                {omitted > 0 && <p className="mt-3 text-nv-micro text-nv-ivory-300">{omitted} smaller directories are not listed.</p>}
            </div>
        </section>
    );
}
