"use client";

import "@xyflow/react/dist/style.css";
import { useEffect, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import { useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderGit2,
  List,
  Loader2,
  Maximize2,
  Network,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { fetchRepoFiles } from "@/app/actions";
import { computeStats } from "./graph";
import { LANG_COLOR, LANG_LABEL } from "./languages";
import { defaultExpanded, layoutGraph, folderNodeId, type Filters } from "./layout";
import { nodeTypes, type MapNode } from "./nodes";
import { DetailPanel, ListView } from "./panels";
import { coverageLine, runPipeline, type FetchFiles, type PipelineState } from "./pipeline";
import { EXTERNAL_FOLDER, EXTERNAL_PREFIX, type CodeGraph, type LangId, type TreeFile } from "./types";
import s from "./codemap.module.css";

export interface CodebaseMapProps {
  owner: string;
  repo: string;
  /** Git tree entries, as held by RepoLoader (`FileNode[]`) or any `{ path, sha?, size? }` list. */
  tree: TreeFile[];
  onOpenFile?: (path: string) => void;
  onAskAboutFile?: (path: string) => void;
  className?: string;
  /** Overrides the file reader (tests and offline demos). Defaults to the `fetchRepoFiles` server action. */
  fetchFiles?: FetchFiles;
}

function usePipeline(owner: string, repo: string, tree: TreeFile[], attempt: number, fetchFiles: FetchFiles | undefined) {
  const key = `${owner}/${repo}/${tree.length}/${attempt}`;
  const [result, setResult] = useState<{ key: string; state: PipelineState } | null>(null);
  const latest = useRef({ tree, fetchFiles });
  useEffect(() => {
    latest.current = { tree, fetchFiles };
  });
  useEffect(() => {
    const ctrl = new AbortController();
    void runPipeline({
      owner,
      repo,
      tree: latest.current.tree,
      fetchFiles: latest.current.fetchFiles ?? fetchRepoFiles,
      signal: ctrl.signal,
      onState: (state) => {
        if (!ctrl.signal.aborted) setResult({ key, state });
      },
    });
    return () => ctrl.abort();
  }, [owner, repo, key, attempt]);
  return result?.key === key ? result.state : null;
}

function ancestorFolders(graph: CodeGraph, id: string): string[] {
  if (id.startsWith(EXTERNAL_PREFIX)) return [EXTERNAL_FOLDER];
  const out: string[] = [];
  for (let f = graph.files.get(id)?.folder; f; f = graph.folders.get(f)?.parent ?? undefined) out.push(f);
  return out;
}

function Inner(props: CodebaseMapProps) {
  const { owner, repo, tree, onOpenFile, onAskAboutFile, className, fetchFiles } = props;
  const reduceMotion = useReducedMotion() ?? false;
  const flow = useReactFlow();
  const [attempt, setAttempt] = useState(0);
  const pipeline = usePipeline(owner, repo, tree, attempt, fetchFiles);

  const [expandedOverride, setExpandedOverride] = useState<Set<string> | null>(null);
  const [hiddenLangs, setHiddenLangs] = useState<ReadonlySet<LangId>>(new Set());
  const [hideExternal, setHideExternal] = useState(false);
  const [hideTests, setHideTests] = useState(true);
  const [showNonSource, setShowNonSource] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Client-only component (loaded with ssr: false), so reading the viewport here cannot cause a hydration mismatch.
  const [listView, setListView] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const [fitTick, setFitTick] = useState(0);
  const pendingFit = useRef<string[] | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const graph = pipeline?.graph;
  const phase = pipeline?.phase;
  useEffect(() => {
    if (listView) return;
    const t = setTimeout(() => {
      const ids = pendingFit.current;
      pendingFit.current = null;
      const duration = reduceMotion ? 0 : 420;
      if (ids?.length) void flow.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.5, maxZoom: 1.1, duration });
      else void flow.fitView({ padding: 0.12, duration });
    }, 90);
    return () => clearTimeout(t);
  }, [fitTick, phase, listView, flow, reduceMotion]);

  if (!pipeline || !graph) {
    return (
      <div className={`${s.root} ${className ?? ""}`}>
        <div className={s.center} role="status">
          <div className={s.card}>
            <span className={s.icoWrap}>
              <Loader2 aria-hidden className={s.spin} size={20} />
            </span>
            <h3>Building the folder structure</h3>
            <p>
              {owner}/{repo}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const expanded = expandedOverride ?? defaultExpanded(graph);
  const filters: Filters = { hiddenLangs, hideExternal, hideTests, showNonSource };
  const layout = layoutGraph(graph, expanded, filters);
  const stats = computeStats(graph);

  const focusPath = hovered ?? selected;
  const focusNode = focusPath ? (layout.nodeOf.get(focusPath) ?? focusPath) : null;
  const hotNodes = new Set<string>();
  if (focusNode) {
    hotNodes.add(focusNode);
    for (const e of layout.edges) {
      if (e.source === focusNode) hotNodes.add(e.target);
      if (e.target === focusNode) hotNodes.add(e.source);
    }
  }
  const selectedNode = selected ? (layout.nodeOf.get(selected) ?? selected) : null;
  const cycleFiles = new Set(graph.cycles.flat());
  const q = query.trim().toLowerCase();
  const matchNodes = new Set<string>();
  if (q) {
    for (const f of graph.files.values()) {
      if (f.path.toLowerCase().includes(q)) {
        const n = layout.nodeOf.get(f.path);
        if (n) matchNodes.add(n);
      }
    }
    for (const e of graph.externals.values()) {
      if (e.name.toLowerCase().includes(q)) {
        const n = layout.nodeOf.get(e.id);
        if (n) matchNodes.add(n);
      }
    }
  }

  const toggleFolder = (nodeId: string) => {
    const path = nodeId.slice("dir:".length);
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedOverride(next);
    pendingFit.current = [nodeId];
    setFitTick((t) => t + 1);
  };

  const select = (id: string) => {
    setSelected(id);
    const hidden = ancestorFolders(graph, id).filter((f) => !expanded.has(f));
    if (hidden.length) {
      setExpandedOverride(new Set([...expanded, ...hidden]));
      pendingFit.current = [id];
      setFitTick((t) => t + 1);
    }
  };

  const nodes: MapNode[] = layout.nodes.map((n) => {
    const state = n.id === selectedNode ? "selected" : !focusNode ? "idle" : hotNodes.has(n.id) ? "hot" : "dim";
    const key = n.kind === "ext" ? n.id : n.path;
    return {
      id: n.id,
      type: n.kind === "folder" ? (n.expanded ? "frame" : "chip") : "file",
      position: { x: n.x, y: n.y },
      parentId: n.parentId,
      initialWidth: n.w,
      initialHeight: n.h,
      style: { width: n.w, height: n.h },
      draggable: false,
      selectable: false,
      focusable: false,
      data: {
        node: n,
        state,
        match: matchNodes.has(n.id),
        inCycle: cycleFiles.has(key),
        onToggle: toggleFolder,
        onSelect: select,
      },
    };
  });

  const edges: Edge[] = layout.edges.map((e) => {
    const incident = !!focusNode && (e.source === focusNode || e.target === focusNode);
    const cls = incident ? (reduceMotion ? s.edgeHotStatic : s.edgeHot) : focusNode ? s.edgeDim : s.edge;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: `s-${e.sourceSide}`,
      targetHandle: `t-${e.targetSide}`,
      type: "smoothstep",
      className: cls,
      pathOptions: { borderRadius: 12 },
      selectable: false,
      focusable: false,
      style: { strokeWidth: incident ? 2 : Math.min(4, 1.1 + Math.log2(e.count) * 0.7) },
      markerEnd: incident ? { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#2f54ff" } : undefined,
    };
  });

  const langsPresent = [...new Set([...graph.files.values()].filter((f) => f.isSource).map((f) => f.lang))].sort();
  const coverage = coverageLine(pipeline);
  const reading = pipeline.phase === "reading" || pipeline.phase === "structure";
  const noSource = pipeline.phase === "done" && pipeline.eligible === 0;

  const expandAll = () => {
    const sourceCount = stats.sourceFiles;
    const all = new Set<string>();
    for (const [p] of graph.folders) {
      if (p && (sourceCount <= 600 || p.split("/").length <= 2)) all.add(p);
    }
    setExpandedOverride(all);
    pendingFit.current = null;
    setFitTick((t) => t + 1);
  };
  const collapseAll = () => {
    setExpandedOverride(new Set());
    pendingFit.current = null;
    setFitTick((t) => t + 1);
  };
  const toggleLang = (l: LangId) => {
    const next = new Set(hiddenLangs);
    if (next.has(l)) next.delete(l);
    else next.add(l);
    setHiddenLangs(next);
  };
  const runSearch = () => {
    if (!q) return;
    const ids = [...matchNodes];
    const hidden = new Set<string>();
    for (const f of graph.files.values()) {
      if (f.path.toLowerCase().includes(q)) for (const a of ancestorFolders(graph, f.path)) if (!expanded.has(a)) hidden.add(a);
    }
    if (hidden.size && hidden.size < 40) setExpandedOverride(new Set([...expanded, ...hidden]));
    pendingFit.current = ids.length ? ids.slice(0, 40) : null;
    setFitTick((t) => t + 1);
  };

  return (
    <div
      className={`${s.root} ${className ?? ""}`}
      data-nv-root
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
          e.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
        }
      }}
    >
      <div className={s.bar} role="toolbar" aria-label="Codebase map controls">
        <label className={s.search}>
          <Search aria-hidden size={15} />
          <span className={s.srOnly}>Search files</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search files and packages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
              if (e.key === "Escape") setQuery("");
            }}
          />
          {q ? <span className={s.count}>{matchNodes.size}</span> : <kbd>Ctrl F</kbd>}
        </label>
        <span className={s.sep} aria-hidden />
        <div className={`${s.barGroup} ${s.zoomGroup}`}>
          <button type="button" className={s.btn} aria-label="Zoom in" onClick={() => void flow.zoomIn({ duration: 160 })}>
            <ZoomIn aria-hidden size={16} />
          </button>
          <button type="button" className={s.btn} aria-label="Zoom out" onClick={() => void flow.zoomOut({ duration: 160 })}>
            <ZoomOut aria-hidden size={16} />
          </button>
          <button type="button" className={s.btn} aria-label="Fit view" onClick={() => setFitTick((t) => t + 1)}>
            <Maximize2 aria-hidden size={16} />
          </button>
          <button type="button" className={s.btn} onClick={expandAll}>
            <ChevronsUpDown aria-hidden size={15} /> Expand all
          </button>
          <button type="button" className={s.btn} onClick={collapseAll}>
            <ChevronsDownUp aria-hidden size={15} /> Collapse all
          </button>
        </div>
        <span className={s.sep} aria-hidden />
        <div className={s.barGroup}>
          <button type="button" className={s.btn} aria-pressed={hideExternal} onClick={() => setHideExternal(!hideExternal)}>
            Hide external
          </button>
          <button type="button" className={s.btn} aria-pressed={hideTests} onClick={() => setHideTests(!hideTests)}>
            Hide tests
          </button>
          <button type="button" className={s.btn} aria-pressed={showNonSource} onClick={() => setShowNonSource(!showNonSource)}>
            Show non-source
          </button>
        </div>
        <div className={s.barGroup} style={{ marginLeft: "auto" }}>
          <button type="button" className={s.btn} aria-pressed={listView} onClick={() => setListView(!listView)}>
            {listView ? <Network aria-hidden size={15} /> : <List aria-hidden size={15} />}
            {listView ? "Graph view" : "List view"}
          </button>
        </div>
        <div className={`${s.barGroup} ${s.langRow}`} role="group" aria-label="Filter by language" style={{ flexBasis: "100%", flexWrap: "wrap" }}>
          {langsPresent.map((l) => (
            <button key={l} type="button" className={`${s.btn} ${s.langChip}`} aria-pressed={!hiddenLangs.has(l)} onClick={() => toggleLang(l)}>
              <span className={s.dot} style={{ background: LANG_COLOR[l] }} />
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      {(reading || coverage) && !noSource && (
        <div className={s.status} data-tone={!reading && coverage ? "warn" : undefined} role="status" aria-live="polite">
          <div className={s.statusRow}>
            {reading ? <Loader2 aria-hidden size={15} className={s.spin} /> : <AlertTriangle aria-hidden size={15} />}
            <span>
              {reading
                ? pipeline.phase === "structure"
                  ? `Structure ready: ${stats.files} files in ${stats.folders} folders. Reading imports…`
                  : `Mapped imports in ${pipeline.read} of ${pipeline.planned} files read so far…`
                : coverage}
            </span>
            {!reading && pipeline.stopped && (
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setAttempt((a) => a + 1)}>
                <RefreshCw aria-hidden size={14} /> Retry
              </button>
            )}
          </div>
          {reading && (
            <div className={s.progress} aria-hidden>
              <i style={{ width: `${pipeline.planned ? Math.round((pipeline.read / pipeline.planned) * 100) : 0}%` }} />
            </div>
          )}
        </div>
      )}

      <div className={s.stage}>
        {listView ? (
          <ListView graph={graph} filters={filters} selected={selected} onSelect={setSelected} />
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onlyRenderVisibleElements
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            elementsSelectable={false}
            minZoom={0.05}
            maxZoom={1.8}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            proOptions={{ hideAttribution: true }}
            onNodeMouseEnter={(_, n) => {
              if (n.type !== "frame") setHovered(n.type === "file" ? (n.data.node.kind === "ext" ? n.id : n.data.node.path) : n.id);
            }}
            onNodeMouseLeave={() => setHovered(null)}
            onPaneClick={() => setSelected(null)}
            aria-label="Codebase import graph"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} color="#d3d6df" />
            <MiniMap
              className={`${s.minimap} ${s.minimapHide}`}
              pannable
              zoomable
              maskColor="rgb(246 247 249 / 0.7)"
              nodeStrokeWidth={0}
              nodeBorderRadius={3}
              nodeColor={(n) => {
                const d = (n as MapNode).data?.node;
                return d?.kind === "folder" ? (d.expanded ? "#e6e8ee" : "#b9c3ff") : LANG_COLOR[d?.lang ?? "other"];
              }}
            />
          </ReactFlow>
        )}

        {pipeline.phase === "error" && pipeline.error && (
          <div className={s.center} role="alert">
            <div className={s.card}>
              <span className={s.icoWrap}>
                <AlertTriangle aria-hidden size={20} />
              </span>
              <h3>{pipeline.error.kind === "rate-limit" ? "GitHub is rate limiting reads" : "Could not read the source files"}</h3>
              <p>
                {pipeline.error.message} The folder structure is available; import wires need file contents.
                {pipeline.error.kind === "rate-limit" ? " Wait a minute, then retry." : ""}
              </p>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setAttempt((a) => a + 1)}>
                <RefreshCw aria-hidden size={14} /> Retry
              </button>
            </div>
          </div>
        )}

        {(stats.files === 0 || noSource) && (
          <div className={s.center}>
            <div className={s.card}>
              <span className={s.icoWrap}>
                <FolderGit2 aria-hidden size={20} />
              </span>
              <h3>{stats.files === 0 ? "This repository is empty" : "No supported source files"}</h3>
              <p>
                {stats.files === 0
                  ? "There are no files to map yet."
                  : "No TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Ruby, PHP, C#, Vue or Svelte files were found, so there are no imports to draw."}
              </p>
            </div>
          </div>
        )}

        {!listView && (
          <div className={s.legend} aria-hidden>
            <span><i className={s.dot} style={{ background: "#2f54ff" }} /> file</span>
            <span>chip = collapsed folder (in / out imports)</span>
            <span>wire = import, importer to imported</span>
            <span>dashed = external package</span>
          </div>
        )}

        {selected && (
          <DetailPanel
            graph={graph}
            id={selected}
            onSelect={select}
            onClose={() => setSelected(null)}
            onOpenFile={onOpenFile}
            onAskAboutFile={onAskAboutFile}
          />
        )}
      </div>

      <div className={s.stats}>
        <span className={s.stat}><b className="nv-num">{stats.files}</b>files</span>
        <span className={s.stat}><b className="nv-num">{stats.folders}</b>folders</span>
        <span className={s.stat}><b className="nv-num">{stats.parsedFiles}</b>of {stats.sourceFiles} source files read</span>
        <span className={s.stat}><b className="nv-num">{stats.importEdges}</b>import edges</span>
        <span className={s.stat}><b className="nv-num">{stats.externalPackages}</b>external packages</span>
        {stats.mostImported && (
          <span className={s.stat}>most imported <code>{stats.mostImported.path.split("/").pop()}</code> ({stats.mostImported.count})</span>
        )}
        {stats.parsedFiles > 0 && (
          <span className={s.stat}>
            <b className="nv-num">{stats.cycleGroups}</b>
            {stats.cycleGroups === 1 ? "import cycle" : "import cycles"}
            {stats.cycleGroups > 0 ? ` (${stats.filesInCycles} files)` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export function CodebaseMap(props: CodebaseMapProps) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

export { folderNodeId };
