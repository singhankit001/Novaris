"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/nv/field";
import { Badge } from "@/components/nv/badge";
import { isFile } from "./build-atlas";
import type { AtlasEdge, AtlasTreeEntry } from "./types";

const RENDER_CAP = 200;

export interface AtlasList2DProps {
  tree: AtlasTreeEntry[];
  edges: AtlasEdge[];
  selectedPath?: string;
  onSelect?: (path: string) => void;
  /** Show cited markers and evidence only once the analysis is complete. */
  showEvidence: boolean;
}

/** The equivalent of the atlas as accessible text: searchable, grouped, keyboard navigable. Always rendered. */
export function AtlasList2D({ tree, edges, selectedPath, onSelect, showEvidence }: AtlasList2DProps) {
  const [q, setQ] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const files = tree.filter(isFile);
  const links = showEvidence ? edges : [];
  const citedBy = new Map<string, AtlasEdge[]>();
  for (const e of links) for (const p of new Set([e.from, e.to])) citedBy.set(p, [...(citedBy.get(p) ?? []), e]);

  const needle = q.trim().toLowerCase();
  const matches = files
    .filter((f) => f.path.toLowerCase().includes(needle))
    .sort((a, b) => Number(citedBy.has(b.path)) - Number(citedBy.has(a.path)) || (a.path < b.path ? -1 : 1));
  const shown = matches.slice(0, RENDER_CAP);
  const groups = new Map<string, AtlasTreeEntry[]>();
  for (const f of shown) {
    const i = f.path.indexOf("/");
    const k = i === -1 ? "(root)" : f.path.slice(0, i);
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  const sel = selectedPath ? tree.find((t) => t.path === selectedPath) : undefined;
  const selEdges = selectedPath ? citedBy.get(selectedPath) ?? [] : [];

  const onKey = (ev: KeyboardEvent) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(ev.key)) return;
    const items = [...(root.current?.querySelectorAll<HTMLButtonElement>("[data-atlas-item]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i === -1) return;
    ev.preventDefault();
    const next = ev.key === "Home" ? 0 : ev.key === "End" ? items.length - 1 : i + (ev.key === "ArrowDown" ? 1 : -1);
    items[Math.max(0, Math.min(items.length - 1, next))]?.focus();
  };

  return (
    <div ref={root} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" onKeyDown={onKey}>
      <div className="min-w-0">
        <Input label="Filter files" hideLabel type="search" placeholder="Filter files by path" value={q} onChange={(e) => setQ(e.target.value)} />
        <p role="status" className="nv-num mt-2 text-nv-small text-nv-ivory-300">
          {matches.length} of {files.length} files match
          {matches.length > shown.length ? `, first ${shown.length} listed. Refine the filter to see the rest.` : "."}
          {links.length > 0 && ` ${citedBy.size} cited in ${links.length} evidence links.`}
        </p>
        {matches.length === 0 && <p className="mt-3 text-nv-body text-nv-ivory-200">No file path contains &ldquo;{q}&rdquo;.</p>}
        <div className="mt-3 max-h-[420px] overflow-y-auto rounded-nv-md border border-nv-graphite-700">
          {[...groups.entries()].map(([name, fs]) => (
            <section key={name} aria-label={`${name} layer`}>
              <h4 className="sticky top-0 border-b border-nv-graphite-700 bg-nv-graphite-900 px-3 py-1.5 font-mono text-nv-small text-nv-ivory-200">{name}</h4>
              <ul>
                {fs.map((f) => (
                  <li key={f.path}>
                    <button
                      type="button"
                      data-atlas-item
                      aria-current={f.path === selectedPath ? "true" : undefined}
                      onClick={() => onSelect?.(f.path)}
                      className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left font-mono text-nv-small hover:bg-nv-graphite-800 ${f.path === selectedPath ? "bg-nv-graphite-800 text-nv-ivory-50" : "text-nv-ivory-100"}`}
                    >
                      <span className="min-w-0 break-all">{f.path}</span>
                      {citedBy.has(f.path) && <Badge status="info">Cited</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <aside aria-label="Selected file details" className="rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-900 p-4">
        {sel ? (
          <>
            <p className="break-all font-mono text-nv-body text-nv-ivory-50">{sel.path}</p>
            <p className="nv-num mt-1 text-nv-small text-nv-ivory-300">
              {[sel.language, sel.size !== undefined ? `${sel.size} bytes` : "size not recorded"].filter(Boolean).join(" · ")}
            </p>
            {selEdges.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {selEdges.map((e) => (
                  <li key={`${e.from}>${e.to}>${e.kind}`} className="text-nv-small text-nv-ivory-200">
                    <span className="font-mono text-nv-copper-300">{e.kind === "cited" ? "cited with" : "imports"}</span>{" "}
                    <span className="break-all font-mono">{e.from === sel.path ? e.to : e.from}</span>
                    <br />
                    <span className="text-nv-ivory-300">Evidence: {e.evidence.source}{e.evidence.detail ? `. ${e.evidence.detail}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-nv-small text-nv-ivory-300">{showEvidence ? "No collected evidence links involve this file." : "Evidence links appear when the analysis completes."}</p>
            )}
          </>
        ) : (
          <p className="text-nv-small text-nv-ivory-300">Select a file to see its path, size and evidence links.</p>
        )}
      </aside>
    </div>
  );
}
