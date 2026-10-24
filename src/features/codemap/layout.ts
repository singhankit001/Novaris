import { findCycles } from "./graph";
import { EXTERNAL_FOLDER, EXTERNAL_PREFIX, type CodeGraph, type LangId } from "./types";

export interface Filters {
  hiddenLangs: ReadonlySet<LangId>;
  hideExternal: boolean;
  hideTests: boolean;
  showNonSource: boolean;
}

export type Side = "t" | "r" | "b" | "l";

export interface LayoutNode {
  id: string;
  kind: "file" | "ext" | "folder";
  /** Repo path for files and folders, package name for externals. */
  path: string;
  name: string;
  lang: LangId;
  parentId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Visible files below a folder; 1 for files. */
  count: number;
  expanded: boolean;
  /** Folders: aggregated imports crossing the folder boundary. Files: direct degree among visible nodes. */
  inDeg: number;
  outDeg: number;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  sourceSide: Side;
  targetSide: Side;
  count: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  visibleFiles: number;
  /** Maps any file path or external id to the node that currently represents it. */
  nodeOf: Map<string, string>;
}

interface Item {
  id: string;
  kind: "file" | "ext" | "folder";
  path: string;
  name: string;
  lang: LangId;
  up?: Item;
  children: Item[];
  expanded: boolean;
  count: number;
  w: number;
  h: number;
  x: number;
  y: number;
  ax: number;
  ay: number;
  leaf?: Item;
}

const HEADER = 54;
const PAD = 16;
const GAP_Y = 16;
const GAP_X = 96;
const MAX_COL_H = 900;
const FILE_H = 34;
const CHIP_H = 68;

export function isFileVisible(graph: CodeGraph, path: string, filters: Filters): boolean {
  const f = graph.files.get(path);
  if (!f) return false;
  if (!filters.showNonSource && !f.isSource) return false;
  if (filters.hideTests && f.isTest) return false;
  return !filters.hiddenLangs.has(f.lang);
}

export const folderNodeId = (path: string) => `dir:${path}`;

const fileWidth = (name: string) => Math.min(250, Math.max(132, Math.round(name.length * 7.4 + 62)));

export function layoutGraph(graph: CodeGraph, expandedFolders: ReadonlySet<string>, filters: Filters): LayoutResult {
  const byId = new Map<string, Item>();
  const fileVisible = (path: string): boolean => isFileVisible(graph, path, filters);

  const mk = (partial: Partial<Item> & Pick<Item, "id" | "kind" | "path" | "name" | "lang">): Item => {
    const item: Item = { children: [], expanded: false, count: 1, w: 0, h: 0, x: 0, y: 0, ax: 0, ay: 0, ...partial };
    byId.set(item.id, item);
    return item;
  };

  const buildFolder = (path: string, up: Item | undefined): Item | null => {
    const folder = graph.folders.get(path);
    if (!folder) return null;
    const item = mk({ id: folderNodeId(path), kind: "folder", path, name: folder.name, lang: "other", up });
    item.expanded = expandedFolders.has(path);
    for (const sub of folder.folders) {
      const child = buildFolder(sub, item);
      if (child) item.children.push(child);
    }
    for (const fp of folder.files) {
      if (!fileVisible(fp)) continue;
      const f = graph.files.get(fp);
      if (f) item.children.push(mk({ id: fp, kind: "file", path: fp, name: f.name, lang: f.lang, up: item }));
    }
    item.count = item.children.reduce((n, c) => n + c.count, 0);
    if (item.count === 0) {
      // drop empty folders from the byId index so nothing maps to them
      byId.delete(item.id);
      return null;
    }
    return item;
  };

  const root = graph.folders.get("");
  let top: Item[] = [];
  if (root) {
    for (const sub of root.folders) {
      const child = buildFolder(sub, undefined);
      if (child) top.push(child);
    }
    for (const fp of root.files) {
      const f = graph.files.get(fp);
      if (f && fileVisible(fp)) top.push(mk({ id: fp, kind: "file", path: fp, name: f.name, lang: f.lang }));
    }
  }
  // A lone top-level folder is a transparent wrapper: its children become the top level.
  while (top.length === 1 && top[0]?.kind === "folder") {
    const only = top[0];
    byId.delete(only.id);
    top = only.children;
    for (const c of top) c.up = undefined;
  }

  if (!filters.hideExternal && graph.externals.size > 0) {
    const ext = mk({ id: folderNodeId(EXTERNAL_FOLDER), kind: "folder", path: EXTERNAL_FOLDER, name: "External", lang: "external" });
    ext.expanded = expandedFolders.has(EXTERNAL_FOLDER);
    for (const e of [...graph.externals.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      ext.children.push(mk({ id: e.id, kind: "ext", path: e.name, name: e.name, lang: "external", up: ext }));
    }
    ext.count = ext.children.length;
    top.push(ext);
  }

  // Visible leaf: the file itself, or the outermost collapsed folder above it.
  // Expanded folders are frames, never edge endpoints; descendants of a collapsed folder collapse into it.
  const walk = (items: Item[], hiddenBy: Item | undefined) => {
    for (const it of items) {
      if (hiddenBy) it.leaf = hiddenBy;
      else it.leaf = it;
      const nextHidden = hiddenBy ?? (it.kind === "folder" && !it.expanded ? it : undefined);
      walk(it.children, nextHidden);
    }
  };
  walk(top, undefined);

  const chainOf = (leaf: Item): Item[] => {
    const chain: Item[] = [];
    for (let c: Item | undefined = leaf; c; c = c.up) chain.push(c);
    return chain.reverse();
  };

  // Collect edges between visible endpoints.
  const nodeOf = new Map<string, string>();
  let visibleFiles = 0;
  for (const it of byId.values()) {
    if (it.kind !== "folder") {
      if (it.kind === "file") visibleFiles++;
      nodeOf.set(it.kind === "file" ? it.path : it.id, it.leaf?.id ?? it.id);
    }
  }

  const rendered = new Map<string, { a: Item; b: Item; count: number }>();
  const levelEdges = new Map<string, Map<string, { a: Item; b: Item; count: number }>>();
  const inDeg = new Map<string, number>();
  const outDeg = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  const addEdge = (from: string, to: string) => {
    const A = byId.get(from)?.leaf;
    const B = byId.get(to)?.leaf;
    if (!A || !B || A === B) return;
    const key = `${A.id}>${B.id}`;
    const r = rendered.get(key);
    if (r) r.count++;
    else rendered.set(key, { a: A, b: B, count: 1 });

    const ca = chainOf(A);
    const cb = chainOf(B);
    let k = 0;
    while (k < ca.length && k < cb.length && ca[k] === cb[k]) k++;
    const ea = ca[k];
    const eb = cb[k];
    if (ea && eb) {
      const container = k === 0 ? "" : (ca[k - 1]?.id ?? "");
      let m = levelEdges.get(container);
      if (!m) levelEdges.set(container, (m = new Map()));
      const lk = `${ea.id}>${eb.id}`;
      const e = m.get(lk);
      if (e) e.count++;
      else m.set(lk, { a: ea, b: eb, count: 1 });
    }
    for (const f of ca.slice(k)) if (f.kind === "folder") bump(outDeg, f.id);
    for (const f of cb.slice(k)) if (f.kind === "folder") bump(inDeg, f.id);
    if (A.kind !== "folder") bump(outDeg, A.id);
    if (B.kind !== "folder") bump(inDeg, B.id);
  };

  for (const e of graph.edges) addEdge(e.from, e.to);
  for (const e of graph.externalEdges) {
    if (!filters.hideExternal && fileVisible(e.from)) addEdge(e.from, e.to);
  }

  // ---- sizing and placement ----
  const sizeLeaf = (it: Item) => {
    if (it.kind === "folder") {
      it.w = Math.min(280, Math.max(208, it.name.length * 8 + 128));
      it.h = CHIP_H;
    } else {
      it.w = fileWidth(it.name);
      it.h = FILE_H;
    }
  };

  const layoutContainer = (items: Item[], containerId: string): { w: number; h: number } => {
    for (const it of items) {
      if (it.kind === "folder" && it.expanded) {
        const inner = layoutContainer(it.children, it.id);
        it.w = Math.max(260, inner.w + PAD * 2);
        it.h = HEADER + inner.h + PAD;
        for (const c of it.children) {
          c.x += PAD;
          c.y += HEADER;
        }
      } else sizeLeaf(it);
    }

    const edgeMap = levelEdges.get(containerId);
    const inSet = new Set(items.map((i) => i.id));
    const adj = new Map<string, string[]>();
    const connected = new Set<string>();
    if (edgeMap) {
      for (const { a, b } of edgeMap.values()) {
        if (!inSet.has(a.id) || !inSet.has(b.id)) continue;
        connected.add(a.id);
        connected.add(b.id);
      }
    }
    for (const id of connected) adj.set(id, []);
    if (edgeMap) for (const { a, b } of edgeMap.values()) if (connected.has(a.id) && connected.has(b.id)) adj.get(a.id)?.push(b.id);

    // Layer by longest path from importers; cycles are collapsed so they share a layer.
    const comp = new Map<string, string>();
    for (const c of findCycles(adj)) for (const id of c) comp.set(id, c[0] ?? id);
    const rep = (id: string) => comp.get(id) ?? id;
    const dagOut = new Map<string, Set<string>>();
    const indeg = new Map<string, number>();
    for (const id of connected) {
      const r = rep(id);
      if (!dagOut.has(r)) dagOut.set(r, new Set());
      if (!indeg.has(r)) indeg.set(r, 0);
    }
    for (const [from, tos] of adj) {
      for (const to of tos) {
        const a = rep(from);
        const b = rep(to);
        if (a === b || dagOut.get(a)?.has(b)) continue;
        dagOut.get(a)?.add(b);
        indeg.set(b, (indeg.get(b) ?? 0) + 1);
      }
    }
    const layerOf = new Map<string, number>();
    const ready = [...indeg].filter(([, d]) => d === 0).map(([id]) => id).sort();
    for (const id of ready) layerOf.set(id, 0);
    while (ready.length) {
      const cur = ready.shift();
      if (cur === undefined) break;
      for (const nxt of dagOut.get(cur) ?? []) {
        layerOf.set(nxt, Math.max(layerOf.get(nxt) ?? 0, (layerOf.get(cur) ?? 0) + 1));
        const d = (indeg.get(nxt) ?? 1) - 1;
        indeg.set(nxt, d);
        if (d === 0) ready.push(nxt);
      }
    }

    const itemById = new Map(items.map((i) => [i.id, i]));
    const layers: Item[][] = [];
    for (const id of [...connected].sort()) {
      const l = layerOf.get(rep(id)) ?? 0;
      const it = itemById.get(id);
      if (it) (layers[l] ??= []).push(it);
    }
    // One barycentre sweep to reduce wire crossings.
    const pos = new Map<string, number>();
    const preds = new Map<string, string[]>();
    for (const [from, tos] of adj) for (const to of tos) (preds.get(to) ?? preds.set(to, []).get(to))?.push(from);
    layers.forEach((layer, li) => {
      if (!layer) return;
      if (li > 0) {
        const bary = (it: Item) => {
          const p = (preds.get(it.id) ?? []).filter((x) => pos.has(x));
          return p.length ? p.reduce((s, x) => s + (pos.get(x) ?? 0), 0) / p.length : 1e9;
        };
        layer.sort((a, b) => bary(a) - bary(b) || a.name.localeCompare(b.name));
      } else layer.sort((a, b) => a.name.localeCompare(b.name));
      layer.forEach((it, i) => pos.set(it.id, i));
    });

    let x = 0;
    let layeredH = 0;
    for (const layer of layers) {
      if (!layer?.length) continue;
      const total = layer.reduce((s, i) => s + i.h + GAP_Y, -GAP_Y);
      const cols = Math.max(1, Math.ceil(total / MAX_COL_H));
      const target = total / cols;
      let col: Item[] = [];
      let colH = 0;
      const flush = () => {
        if (!col.length) return;
        const cw = Math.max(...col.map((i) => i.w));
        let y = 0;
        for (const it of col) {
          it.x = x;
          it.y = y;
          y += it.h + GAP_Y;
        }
        layeredH = Math.max(layeredH, y - GAP_Y);
        x += cw + GAP_X;
        col = [];
        colH = 0;
      };
      for (const it of layer) {
        if (col.length && colH + it.h > target + 40) flush();
        col.push(it);
        colH += it.h + GAP_Y;
      }
      flush();
    }
    let layeredW = x > 0 ? x - GAP_X : 0;

    // Rows of items, left to right, wrapping at `target`. Returns the used size.
    const shelf = (list: Item[], target: number, y0: number, gap: number) => {
      let cx = 0;
      let cy = y0;
      let rowH = 0;
      let usedW = 0;
      for (const it of list) {
        if (cx > 0 && cx + it.w > target) {
          cx = 0;
          cy += rowH + gap;
          rowH = 0;
        }
        it.x = cx;
        it.y = cy;
        cx += it.w + gap;
        rowH = Math.max(rowH, it.h);
        usedW = Math.max(usedW, cx - gap);
      }
      return { w: usedW, h: list.length ? cy + rowH : 0 };
    };

    // A long dependency chain would make a very wide strip: fold the layers into rows, keeping reading order.
    if (layeredW > 1400 && layeredW > 1.9 * layeredH) {
      const flat = layers.flat().filter((i): i is Item => !!i);
      const area = flat.reduce((n, i) => n + (i.w + 40) * (i.h + 40), 0);
      const size = shelf(flat, Math.min(1500, Math.max(720, Math.sqrt(area * 2.2))), 0, 28);
      layeredW = size.w;
      layeredH = size.h;
    }

    // Items with no imports among their siblings are packed below.
    const loose = items.filter((i) => !connected.has(i.id)).sort((a, b) => Number(b.kind === "folder") - Number(a.kind === "folder") || a.name.localeCompare(b.name));
    let looseW = 0;
    let looseH = 0;
    if (loose.length) {
      const area = loose.reduce((n, i) => n + (i.w + 14) * (i.h + 14), 0);
      const widest = Math.max(...loose.map((i) => i.w));
      const target = Math.max(layeredW, widest, 520, Math.sqrt(area * 1.8));
      const size = shelf(loose, target, layeredW > 0 ? layeredH + 44 : 0, 14);
      looseW = size.w;
      looseH = size.h;
    }
    return { w: Math.max(layeredW, looseW), h: Math.max(layeredH, looseH) };
  };

  layoutContainer(top, "");

  // ---- absolute positions, flatten (parents before children) ----
  const nodes: LayoutNode[] = [];
  const emit = (it: Item, parent: Item | undefined) => {
    it.ax = (parent?.ax ?? 0) + it.x;
    it.ay = (parent?.ay ?? 0) + it.y;
    nodes.push({
      id: it.id,
      kind: it.kind,
      path: it.path,
      name: it.name,
      lang: it.lang,
      parentId: parent?.id,
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
      count: it.count,
      expanded: it.expanded,
      inDeg: inDeg.get(it.id) ?? 0,
      outDeg: outDeg.get(it.id) ?? 0,
    });
    if (it.kind === "folder" && it.expanded) for (const c of it.children) emit(c, it);
  };
  for (const it of top) emit(it, undefined);

  const edges: LayoutEdge[] = [];
  for (const [key, { a, b, count }] of rendered) {
    const acy = a.ay + a.h / 2;
    const bcy = b.ay + b.h / 2;
    let sourceSide: Side;
    let targetSide: Side;
    if (b.ax - (a.ax + a.w) >= 24) [sourceSide, targetSide] = ["r", "l"];
    else if (a.ax - (b.ax + b.w) >= 24) [sourceSide, targetSide] = ["l", "r"];
    else if (bcy >= acy) [sourceSide, targetSide] = ["b", "t"];
    else [sourceSide, targetSide] = ["t", "b"];
    edges.push({ id: key, source: a.id, target: b.id, sourceSide, targetSide, count });
  }

  return { nodes, edges, visibleFiles, nodeOf };
}

/**
 * Folders to open first. Small repos open fully. Larger ones open the biggest folders breadth-first
 * until about 30 chips and files are on screen, so the first view is an overview, not a wall of nodes.
 */
export function defaultExpanded(graph: CodeGraph): Set<string> {
  const counts = new Map<string, number>();
  const count = (path: string): number => {
    const folder = graph.folders.get(path);
    if (!folder) return 0;
    const n = folder.files.filter((p) => graph.files.get(p)?.isSource && !graph.files.get(p)?.isTest).length + folder.folders.reduce((t, f) => t + count(f), 0);
    counts.set(path, n);
    return n;
  };
  const total = count("");
  const all = new Set<string>();
  if (total <= 40) {
    for (const p of graph.folders.keys()) if (p) all.add(p);
    return all;
  }
  const entitiesOf = (path: string) => {
    const f = graph.folders.get(path);
    return f ? f.folders.filter((x) => (counts.get(x) ?? 0) > 0).length + f.files.filter((p) => graph.files.get(p)?.isSource && !graph.files.get(p)?.isTest).length : 0;
  };
  const frontier = (graph.folders.get("")?.folders ?? []).filter((p) => (counts.get(p) ?? 0) > 0);
  let entities = frontier.length + entitiesOf("") - (graph.folders.get("")?.folders.length ?? 0);
  while (frontier.length) {
    frontier.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
    const next = frontier.shift();
    if (next === undefined) break;
    const grow = entitiesOf(next) - 1;
    if (entities + grow > 30) continue;
    all.add(next);
    entities += grow;
    for (const sub of graph.folders.get(next)?.folders ?? []) if ((counts.get(sub) ?? 0) > 0) frontier.push(sub);
  }
  return all;
}

export function isExternalId(id: string): boolean {
  return id.startsWith(EXTERNAL_PREFIX);
}
