import { cn } from "@/components/nv/cn";
import { KIND_LABEL, type ArchEdge, type ArchNode } from "./graph-types";

/** Semantic list of nodes and their outgoing connections: the SSR/loading fallback and the screen-reader view. */
export function GraphList({ nodes, edges, label, className }: { nodes: ArchNode[]; edges: ArchEdge[]; label: string; className?: string }) {
  const name = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
  return (
    <div className={className}>
      <h3 className="m-0 mb-2 text-nv-small font-medium text-nv-ivory-100">{label}</h3>
      <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2">
        {nodes.map((n) => {
          const out = edges.filter((e) => e.from === n.id);
          return (
            <li key={n.id} className={cn("rounded-nv-sm border border-nv-graphite-700 bg-white px-3 py-2 text-nv-small text-nv-ivory-200")}>
              <span className="font-medium text-nv-ivory-100">{n.label}</span>
              <span className="text-nv-graphite-400"> ({KIND_LABEL[n.kind]}{n.severity ? `, ${n.severity}` : ""})</span>
              {n.detail ? <span className="block font-nv-mono text-nv-micro text-nv-ivory-300">{n.detail}</span> : null}
              {out.length ? (
                <span className="block text-nv-micro text-nv-graphite-400">
                  {out.map((e) => `${e.label ?? "connects to"} ${name(e.to)}`).join("; ")}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
