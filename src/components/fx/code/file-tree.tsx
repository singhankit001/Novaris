"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/components/nv/cn";

export interface TreeNode {
  id: string;
  name: string;
  /** Present (even empty) = folder. */
  children?: TreeNode[];
  /** "context" = included in the AI's context, "changed" = modified, "flagged" = has a finding. */
  status?: "context" | "changed" | "flagged";
}

/**
 * Keyboard-navigable tree (WAI-ARIA tree pattern, flat treeitems). Controlled via `expanded`/`selected`,
 * otherwise uncontrolled from `defaultExpanded`/`defaultSelected`. `onSelect` fires for files only.
 */
export interface FileTreeProps {
  nodes: TreeNode[];
  label: string;
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  selected?: string | null;
  defaultSelected?: string | null;
  onSelect?: (node: TreeNode) => void;
  className?: string;
}

interface Row {
  node: TreeNode;
  level: number;
  parent: string | null;
  pos: number;
  size: number;
}

const STATUS = {
  context: { text: "In context", cls: "bg-nv-copper-wash text-nv-copper-300" },
  changed: { text: "Changed", cls: "bg-nv-violet-wash text-nv-violet-600" },
  flagged: { text: "Finding", cls: "bg-nv-warning-wash text-nv-warning" },
} as const;

function flatten(nodes: TreeNode[], open: Set<string>, level = 1, parent: string | null = null): Row[] {
  return nodes.flatMap((node, i) => [
    { node, level, parent, pos: i + 1, size: nodes.length },
    ...(node.children && open.has(node.id) ? flatten(node.children, open, level + 1, node.id) : []),
  ]);
}

export function FileTree({ nodes, label, expanded, defaultExpanded = [], onExpandedChange, selected, defaultSelected = null, onSelect, className }: FileTreeProps) {
  const reduce = useReducedMotion();
  const [openState, setOpenState] = useState(defaultExpanded);
  const [selState, setSelState] = useState(defaultSelected);
  const [focusId, setFocusId] = useState<string | null>(null);
  const root = useRef<HTMLUListElement>(null);
  const openIds = expanded ?? openState;
  const selId = selected !== undefined ? selected : selState;
  const rows = flatten(nodes, new Set(openIds));
  const tabId = rows.some((r) => r.node.id === focusId) ? focusId : (rows.find((r) => r.node.id === selId) ?? rows[0])?.node.id;

  function setOpen(ids: string[]) {
    setOpenState(ids);
    onExpandedChange?.(ids);
  }
  function toggle(id: string, want: boolean) {
    const has = openIds.includes(id);
    if (want !== has) setOpen(want ? [...openIds, id] : openIds.filter((x) => x !== id));
  }
  function focusRow(id: string) {
    setFocusId(id);
    root.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.focus();
  }
  function activate(row: Row) {
    setFocusId(row.node.id);
    if (row.node.children) toggle(row.node.id, !openIds.includes(row.node.id));
    else {
      setSelState(row.node.id);
      onSelect?.(row.node);
    }
  }
  function onKey(e: KeyboardEvent) {
    const i = rows.findIndex((r) => r.node.id === tabId);
    const row = rows[i];
    if (!row) return;
    const isOpen = openIds.includes(row.node.id);
    const go = (j: number) => {
      const t = rows[Math.max(0, Math.min(rows.length - 1, j))];
      if (t) focusRow(t.node.id);
    };
    switch (e.key) {
      case "ArrowDown": go(i + 1); break;
      case "ArrowUp": go(i - 1); break;
      case "Home": go(0); break;
      case "End": go(rows.length - 1); break;
      case "ArrowRight":
        if (row.node.children && !isOpen) toggle(row.node.id, true);
        else if (row.node.children?.length) go(i + 1);
        break;
      case "ArrowLeft":
        if (row.node.children && isOpen) toggle(row.node.id, false);
        else if (row.parent) focusRow(row.parent);
        break;
      case "Enter":
      case " ": activate(row); break;
      default: return;
    }
    e.preventDefault();
  }

  return (
    <ul ref={root} role="tree" aria-label={label} onKeyDown={onKey} className={cn("m-0 list-none rounded-nv-md border border-nv-graphite-700 bg-white p-1.5 font-nv-mono text-nv-small shadow-nv-xs", className)}>
      <AnimatePresence initial={false}>
        {rows.map((r) => {
          const { node } = r;
          const isFolder = !!node.children;
          const isOpen = openIds.includes(node.id);
          const st = node.status ? STATUS[node.status] : null;
          const Icon = isFolder ? (isOpen ? FolderOpen : Folder) : File;
          return (
            <motion.li
              key={node.id}
              role="treeitem"
              data-id={node.id}
              aria-level={r.level}
              aria-setsize={r.size}
              aria-posinset={r.pos}
              aria-expanded={isFolder ? isOpen : undefined}
              aria-selected={isFolder ? undefined : node.id === selId}
              tabIndex={node.id === tabId ? 0 : -1}
              onClick={() => activate(r)}
              onFocus={() => setFocusId(node.id)}
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: reduce ? 0.12 : 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="m-0 cursor-pointer list-none overflow-hidden"
            >
              <span
                style={{ paddingInlineStart: `${(r.level - 1) * 16 + 8}px` }}
                className={cn(
                  "flex min-h-9 items-center gap-1.5 rounded-nv-xs pe-2 text-nv-ivory-200 transition-colors hover:bg-nv-graphite-800",
                  node.id === selId && "bg-nv-copper-wash text-nv-ivory-100 shadow-[inset_2px_0_0_var(--nv-copper-400)]",
                )}
              >
                <ChevronRight aria-hidden className={cn("size-3.5 shrink-0 text-nv-graphite-400 transition-transform", !isFolder && "invisible", isOpen && "rotate-90")} />
                <Icon aria-hidden className={cn("size-4 shrink-0", isFolder ? "text-nv-copper-400" : "text-nv-graphite-400")} />
                <span className="min-w-0 flex-1 truncate">{node.name}</span>
                {st ? (
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-nv-sans text-nv-micro", st.cls)}>
                    {node.status === "flagged" ? <AlertTriangle aria-hidden className="size-3" /> : null}
                    {st.text}
                  </span>
                ) : null}
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
