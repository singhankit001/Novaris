"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Folder, MessageSquare, Package, X } from "lucide-react";
import { LANG_COLOR, LANG_LABEL } from "./languages";
import { isFileVisible, type Filters } from "./layout";
import { EXTERNAL_PREFIX, type CodeGraph } from "./types";
import s from "./codemap.module.css";

interface DetailProps {
  graph: CodeGraph;
  /** File path or external id. */
  id: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onOpenFile?: (path: string) => void;
  onAskAboutFile?: (path: string) => void;
}

function LinkList({ title, ids, graph, onSelect }: { title: string; ids: string[]; graph: CodeGraph; onSelect: (id: string) => void }) {
  return (
    <section aria-label={title}>
      <h3 className={s.sectionTitle}>
        {title} <span className="nv-num">({ids.length})</span>
      </h3>
      {ids.length === 0 ? (
        <p className={s.empty}>None found in the files read.</p>
      ) : (
        <ul className={s.links}>
          {[...ids].sort().map((id) => (
            <li key={id}>
              <button type="button" className={s.link} onClick={() => onSelect(id)}>
                {id.startsWith(EXTERNAL_PREFIX) ? <Package aria-hidden size={13} /> : <span className={s.dot} style={{ background: LANG_COLOR[graph.files.get(id)?.lang ?? "other"] }} />}
                {id.startsWith(EXTERNAL_PREFIX) ? id.slice(EXTERNAL_PREFIX.length) : id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DetailPanel({ graph, id, onSelect, onClose, onOpenFile, onAskAboutFile }: DetailProps) {
  const isExt = id.startsWith(EXTERNAL_PREFIX);
  const file = graph.files.get(id);
  if (!isExt && !file) return null;
  const imports = graph.outgoing.get(id) ?? [];
  const importedBy = graph.incoming.get(id) ?? [];
  const inCycle = graph.cycles.some((c) => c.includes(id));
  const lang = isExt ? "external" : (file?.lang ?? "other");
  const title = isExt ? id.slice(EXTERNAL_PREFIX.length) : (file?.name ?? id);
  return (
    <aside className={s.panel} aria-label={`Details for ${title}`}>
      <div className={s.panelHead}>
        <button type="button" className={`${s.btn} ${s.close}`} aria-label="Close details" onClick={onClose}>
          <X aria-hidden size={16} />
        </button>
        <h2 className={s.panelTitle} style={{ paddingRight: 36, margin: 0 }}>
          {isExt ? <Package aria-hidden size={16} /> : <span className={s.dot} style={{ background: LANG_COLOR[lang] }} />}
          {title}
        </h2>
        <div className={s.panelPath}>{isExt ? "External package" : id}</div>
        <div className={s.panelPath}>
          {LANG_LABEL[lang]}
          {inCycle ? " · part of an import cycle" : ""}
          {file && !file.parsed && !isExt ? " · imports not read" : ""}
        </div>
      </div>
      <div className={s.panelBody}>
        <div className={s.metrics}>
          <div className={s.metric}>
            <b className="nv-num">{importedBy.length}</b>
            <span>Fan-in (imported by)</span>
          </div>
          <div className={s.metric}>
            <b className="nv-num">{imports.length}</b>
            <span>Fan-out (imports)</span>
          </div>
        </div>
        {!isExt && <LinkList title="Imports" ids={imports} graph={graph} onSelect={onSelect} />}
        <LinkList title="Imported by" ids={importedBy} graph={graph} onSelect={onSelect} />
      </div>
      {!isExt && (onOpenFile || onAskAboutFile) && (
        <div className={s.actions}>
          {onOpenFile && (
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => onOpenFile(id)}>
              <ExternalLink aria-hidden size={14} /> Open file
            </button>
          )}
          {onAskAboutFile && (
            <button type="button" className={s.btn} onClick={() => onAskAboutFile(id)}>
              <MessageSquare aria-hidden size={14} /> Ask about this file
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

interface ListProps {
  graph: CodeGraph;
  filters: Filters;
  selected: string | null;
  onSelect: (id: string) => void;
}

function FileRow({ graph, path, selected, onSelect }: { graph: CodeGraph; path: string; selected: boolean; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const f = graph.files.get(path);
  if (!f) return null;
  const imports = graph.outgoing.get(path) ?? [];
  const importedBy = graph.incoming.get(path) ?? [];
  return (
    <li>
      <button
        type="button"
        className={s.listRow}
        aria-expanded={open}
        aria-current={selected || undefined}
        onClick={() => {
          setOpen(!open);
          onSelect(path);
        }}
      >
        <span className={s.dot} style={{ background: LANG_COLOR[f.lang] }} />
        <span>{f.name}</span>
        <span className={s.listMeta}>
          <span className="nv-num">{importedBy.length}</span> in · <span className="nv-num">{imports.length}</span> out
        </span>
      </button>
      {open && (
        <div className={s.listDetail}>
          <LinkList title="Imports" ids={imports} graph={graph} onSelect={onSelect} />
          <LinkList title="Imported by" ids={importedBy} graph={graph} onSelect={onSelect} />
        </div>
      )}
    </li>
  );
}

function FolderRow({ graph, path, filters, selected, onSelect, depth }: ListProps & { path: string; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const folder = graph.folders.get(path);
  if (!folder) return null;
  const files = folder.files.filter((p) => isFileVisible(graph, p, filters));
  const count = countVisible(graph, path, filters);
  if (count === 0) return null;
  return (
    <li>
      <button type="button" className={s.listRow} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <ChevronDown aria-hidden size={14} /> : <ChevronRight aria-hidden size={14} />}
        <Folder aria-hidden size={14} className={s.folderIcon} />
        <strong>{folder.name}</strong>
        <span className={s.listMeta}>
          <span className="nv-num">{count}</span> files
        </span>
      </button>
      {open && (
        <ul>
          {folder.folders.map((sub) => (
            <FolderRow key={sub} graph={graph} path={sub} filters={filters} selected={selected} onSelect={onSelect} depth={depth + 1} />
          ))}
          {files.map((p) => (
            <FileRow key={p} graph={graph} path={p} selected={selected === p} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

function countVisible(graph: CodeGraph, path: string, filters: Filters): number {
  const folder = graph.folders.get(path);
  if (!folder) return 0;
  let n = folder.files.filter((p) => isFileVisible(graph, p, filters)).length;
  for (const sub of folder.folders) n += countVisible(graph, sub, filters);
  return n;
}

/** The same graph as the canvas, as a nested list that works with a keyboard and a screen reader. */
export function ListView({ graph, filters, selected, onSelect }: ListProps) {
  const root = graph.folders.get("");
  if (!root) return null;
  const rootFiles = root.files.filter((p) => isFileVisible(graph, p, filters));
  return (
    <nav className={s.list} aria-label="Repository files and their imports">
      <ul>
        {root.folders.map((sub) => (
          <FolderRow key={sub} graph={graph} path={sub} filters={filters} selected={selected} onSelect={onSelect} depth={0} />
        ))}
        {rootFiles.map((p) => (
          <FileRow key={p} graph={graph} path={p} selected={selected === p} onSelect={onSelect} />
        ))}
      </ul>
    </nav>
  );
}
