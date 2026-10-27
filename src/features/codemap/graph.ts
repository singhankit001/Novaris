import { toCodeFile } from "./languages";
import type { Resolution } from "./resolve";
import {
  EXTERNAL_PREFIX,
  type CodeFile,
  type CodeFolder,
  type CodeGraph,
  type GraphStats,
  type ImportRef,
  type TreeFile,
} from "./types";

export interface BuildInput {
  tree: TreeFile[];
  /** Imports per parsed file. A file present here counts as read, even with zero imports. */
  parsed: Map<string, ImportRef[]>;
  resolve: (from: string, ref: ImportRef) => Resolution;
}

/**
 * Strongly connected components with more than one member (iterative Tarjan, so deep import chains cannot overflow the stack).
 * Nodes are the keys of `adj`; edges to unknown nodes are ignored.
 */
export function findCycles(adj: Map<string, string[]>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const out: string[][] = [];
  let counter = 0;

  for (const root of adj.keys()) {
    if (index.has(root)) continue;
    const work: Array<{ v: string; i: number }> = [{ v: root, i: 0 }];
    index.set(root, counter);
    low.set(root, counter);
    counter++;
    stack.push(root);
    onStack.add(root);
    while (work.length) {
      const frame = work[work.length - 1];
      if (!frame) break;
      const next = adj.get(frame.v) ?? [];
      if (frame.i < next.length) {
        const w = next[frame.i++];
        if (w === undefined || !adj.has(w)) continue;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter);
          counter++;
          stack.push(w);
          onStack.add(w);
          work.push({ v: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v) ?? 0, index.get(w) ?? 0));
        }
      } else {
        work.pop();
        const parent = work[work.length - 1];
        if (parent) low.set(parent.v, Math.min(low.get(parent.v) ?? 0, low.get(frame.v) ?? 0));
        if (low.get(frame.v) === index.get(frame.v)) {
          const comp: string[] = [];
          let w: string | undefined;
          do {
            w = stack.pop();
            if (w === undefined) break;
            onStack.delete(w);
            comp.push(w);
          } while (w !== frame.v);
          if (comp.length > 1) out.push(comp.sort());
        }
      }
    }
  }
  return out.sort((a, b) => b.length - a.length || (a[0] ?? "").localeCompare(b[0] ?? ""));
}

function push(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function buildCodeGraph(input: BuildInput): CodeGraph {
  const files = new Map<string, CodeFile>();
  const folders = new Map<string, CodeFolder>();
  folders.set("", { path: "", name: "", parent: null, folders: [], files: [] });

  const ensureFolder = (path: string): CodeFolder => {
    const existing = folders.get(path);
    if (existing) return existing;
    const slash = path.lastIndexOf("/");
    const parentPath = slash === -1 ? "" : path.slice(0, slash);
    const parent = ensureFolder(parentPath);
    const folder: CodeFolder = { path, name: path.slice(slash + 1), parent: parentPath, folders: [], files: [] };
    folders.set(path, folder);
    parent.folders.push(path);
    return folder;
  };

  for (const entry of input.tree) {
    if (entry.type === "tree" || files.has(entry.path)) continue;
    const file = toCodeFile(entry, input.parsed.has(entry.path));
    files.set(file.path, file);
    ensureFolder(file.folder).files.push(file.path);
  }
  for (const f of folders.values()) {
    f.folders.sort((a, b) => a.localeCompare(b));
    f.files.sort((a, b) => a.localeCompare(b));
  }

  const edges: CodeGraph["edges"] = [];
  const externalEdges: CodeGraph["edges"] = [];
  const externals: CodeGraph["externals"] = new Map();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const seen = new Set<string>();

  for (const [from, refs] of input.parsed) {
    if (!files.has(from)) continue;
    for (const ref of refs) {
      const res = input.resolve(from, ref);
      if (res.kind === "skip") continue;
      if (res.kind === "file") {
        if (res.path === from || !files.has(res.path)) continue;
        const key = `${from}\0${res.path}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from, to: res.path });
        push(outgoing, from, res.path);
        push(incoming, res.path, from);
      } else {
        const id = `${EXTERNAL_PREFIX}${res.name}`;
        const key = `${from}\0${id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!externals.has(id)) externals.set(id, { id, name: res.name });
        externalEdges.push({ from, to: id });
        push(outgoing, from, id);
        push(incoming, id, from);
      }
    }
  }

  const adj = new Map<string, string[]>();
  for (const path of files.keys()) adj.set(path, []);
  for (const e of edges) adj.get(e.from)?.push(e.to);

  return { files, folders, externals, edges, externalEdges, outgoing, incoming, cycles: findCycles(adj) };
}

export function computeStats(graph: CodeGraph): GraphStats {
  let sourceFiles = 0;
  let parsedFiles = 0;
  for (const f of graph.files.values()) {
    if (f.isSource) sourceFiles++;
    if (f.parsed) parsedFiles++;
  }
  let mostImported: GraphStats["mostImported"] = null;
  for (const [path, from] of graph.incoming) {
    if (!graph.files.has(path)) continue;
    const count = from.length;
    if (!mostImported || count > mostImported.count || (count === mostImported.count && path < mostImported.path)) {
      mostImported = { path, count };
    }
  }
  return {
    files: graph.files.size,
    folders: graph.folders.size - 1,
    sourceFiles,
    parsedFiles,
    importEdges: graph.edges.length,
    externalPackages: graph.externals.size,
    mostImported,
    cycleGroups: graph.cycles.length,
    filesInCycles: graph.cycles.reduce((n, c) => n + c.length, 0),
  };
}
