import type { AtlasEdge, AtlasLayer, AtlasLayout, AtlasNode, AtlasTreeEntry } from "./types";

export interface BuildOptions {
  maxLayers?: number;
  maxFilesPerLayer?: number;
  cols?: number;
  /** Paths always drawn first (cited files), so evidence edges stay visible. */
  pinned?: string[];
}

const ROOT = "(root)";

export function isFile(e: AtlasTreeEntry): boolean {
  return e.type === "file" || e.type === "blob";
}

export function toNode(e: AtlasTreeEntry): AtlasNode {
  return {
    id: e.path,
    path: e.path,
    kind: isFile(e) ? "file" : "dir",
    depth: e.path.split("/").length,
    ...(e.size !== undefined ? { size: e.size } : {}),
    ...(e.language ? { language: e.language } : {}),
  };
}

export function citedPaths(edges: AtlasEdge[]): string[] {
  return [...new Set(edges.flatMap((e) => [e.from, e.to]))];
}

/** Pure and deterministic: same tree in, same layout out. Never adds nodes that are not in the tree. */
export function buildAtlas(tree: AtlasTreeEntry[], opts: BuildOptions = {}): AtlasLayout {
  const { maxLayers = 8, maxFilesPerLayer = 60, cols = 12, pinned = [] } = opts;
  const pin = new Set(pinned);
  const groups = new Map<string, AtlasTreeEntry[]>();
  for (const e of tree) {
    if (!isFile(e)) continue;
    const i = e.path.indexOf("/");
    const key = i === -1 ? ROOT : e.path.slice(0, i);
    const g = groups.get(key);
    if (g) g.push(e);
    else groups.set(key, [e]);
  }
  const ordered = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
  const shown = ordered.slice(0, maxLayers);
  const rest = ordered.slice(maxLayers);

  const layers: AtlasLayer[] = shown.map(([name, files]) => {
    const sorted = [...files].sort(
      (a, b) => Number(pin.has(b.path)) - Number(pin.has(a.path)) || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
    );
    const nodes = sorted.slice(0, maxFilesPerLayer).map(toNode);
    return { id: name, name, fileCount: files.length, nodes, hiddenCount: files.length - nodes.length };
  });
  if (rest.length) {
    const n = rest.reduce((s, [, f]) => s + f.length, 0);
    layers.push({
      id: "+more",
      name: `+${rest.length} more ${rest.length === 1 ? "directory" : "directories"}`,
      fileCount: n,
      nodes: [],
      hiddenCount: n,
      aggregate: true,
    });
  }

  const slots: AtlasLayout["slots"] = {};
  layers.forEach((l, layer) =>
    l.nodes.forEach((n, i) => {
      slots[n.id] = { layer, col: i % cols, row: Math.floor(i / cols) };
    }),
  );
  return {
    layers,
    totalFiles: ordered.reduce((s, [, f]) => s + f.length, 0),
    totalLayers: ordered.length,
    hiddenFiles: layers.reduce((s, l) => s + l.hiddenCount, 0),
    slots,
    cols,
  };
}

/** Edges whose endpoints are both drawn. The rest stay in the text list only. */
export function drawableEdges(layout: AtlasLayout, edges: AtlasEdge[]): AtlasEdge[] {
  return edges.filter((e) => layout.slots[e.from] && layout.slots[e.to]);
}
