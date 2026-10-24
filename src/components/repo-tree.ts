export interface TreeNode {
    name: string;
    path: string;
    type: "blob" | "tree";
    /** Files below this folder (0 for files). */
    fileCount: number;
    children?: TreeNode[];
}

export interface FlatRow {
    node: TreeNode;
    depth: number;
    /** 1-based position among siblings and sibling count, for aria-posinset / aria-setsize. */
    posInSet: number;
    setSize: number;
    parentPath: string | null;
}

interface InputNode {
    path: string;
    type?: "blob" | "tree";
}

/** Builds a folder-first sorted tree. Intermediate folders are created even when the input omits them. */
export function buildTree(files: InputNode[]): TreeNode[] {
    const root: TreeNode[] = [];
    const index = new Map<string, TreeNode>();

    for (const file of files) {
        const parts = file.path.split("/");
        let level = root;
        let current = "";
        parts.forEach((part, i) => {
            current = current ? `${current}/${part}` : part;
            let node = index.get(current);
            if (!node) {
                const isFile = i === parts.length - 1 && file.type !== "tree";
                node = { name: part, path: current, type: isFile ? "blob" : "tree", fileCount: 0, children: isFile ? undefined : [] };
                index.set(current, node);
                level.push(node);
            }
            if (i === parts.length - 1 && file.type !== "tree" && node.type === "blob") {
                // count this file on every ancestor folder
                let ancestor = "";
                for (let k = 0; k < parts.length - 1; k++) {
                    ancestor = ancestor ? `${ancestor}/${parts[k]}` : parts[k];
                    const a = index.get(ancestor);
                    if (a) a.fileCount += 1;
                }
            }
            if (node.children) level = node.children;
        });
    }

    const sort = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "tree" ? -1 : 1));
        nodes.forEach((n) => n.children && sort(n.children));
    };
    sort(root);
    return root;
}

/** Folders that must be open so every match is visible, plus the set of visible paths. */
export function filterTree(tree: TreeNode[], query: string): { visible: Set<string>; open: Set<string>; matches: number } | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const visible = new Set<string>();
    const open = new Set<string>();
    let matches = 0;
    const walk = (nodes: TreeNode[]): boolean => {
        let any = false;
        for (const n of nodes) {
            const selfMatch = n.path.toLowerCase().includes(q);
            const childMatch = n.children ? walk(n.children) : false;
            if (n.type === "blob" && selfMatch) matches += 1;
            if (selfMatch || childMatch) {
                visible.add(n.path);
                if (childMatch) open.add(n.path);
                any = true;
            }
        }
        return any;
    };
    walk(tree);
    return { visible, open, matches };
}

/** Flattens the visible part of the tree. Only open folders contribute children. */
export function flattenTree(tree: TreeNode[], expanded: Set<string>, visible: Set<string> | null): FlatRow[] {
    const rows: FlatRow[] = [];
    const walk = (nodes: TreeNode[], depth: number, parentPath: string | null) => {
        const shown = visible ? nodes.filter((n) => visible.has(n.path)) : nodes;
        shown.forEach((node, i) => {
            rows.push({ node, depth, posInSet: i + 1, setSize: shown.length, parentPath });
            if (node.children && expanded.has(node.path)) walk(node.children, depth + 1, node.path);
        });
    };
    walk(tree, 0, null);
    return rows;
}

/** Index of the next row whose name starts with `prefix`, searching after `from` and wrapping. */
export function typeAheadIndex(rows: FlatRow[], from: number, prefix: string): number {
    const p = prefix.toLowerCase();
    if (!p || rows.length === 0) return -1;
    for (let step = 1; step <= rows.length; step++) {
        const i = (from + step) % rows.length;
        if (rows[i].node.name.toLowerCase().startsWith(p)) return i;
    }
    return -1;
}

/** Window of rows to render for a scroll position, with overscan. */
export function visibleWindow(total: number, rowHeight: number, scrollTop: number, viewport: number, overscan = 8): { start: number; end: number } {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(total, Math.ceil((scrollTop + viewport) / rowHeight) + overscan);
    return { start, end };
}

/** Ancestor folder paths of `path`, outermost first (excludes the path itself). */
export function ancestorsOf(path: string): string[] {
    const parts = path.split("/");
    const out: string[] = [];
    let cur = "";
    for (let i = 0; i < parts.length - 1; i++) {
        cur = cur ? `${cur}/${parts[i]}` : parts[i];
        out.push(cur);
    }
    return out;
}

export interface DirectorySummary {
    name: string;
    fileCount: number;
}

/** Top-level directories with real file counts, plus files at the root. Used by the 2D structure view. */
export function summarizeTopLevel(tree: TreeNode[]): { directories: DirectorySummary[]; rootFiles: number } {
    return {
        directories: tree.filter((n) => n.type === "tree").map((n) => ({ name: n.name, fileCount: n.fileCount })).sort((a, b) => b.fileCount - a.fileCount),
        rootFiles: tree.filter((n) => n.type === "blob").length,
    };
}
