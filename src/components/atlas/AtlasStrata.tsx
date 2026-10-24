import type { AtlasEdge, AtlasLayout } from "./types";
import { drawableEdges } from "./build-atlas";

const CELL = 14;
const PAD = 12;
const LABEL = 22;
const BAND = 5 * CELL + LABEL + 12;

/** Static SVG strata. Same data and labels as the 3D scene; used for reduced motion, no WebGL, and poster. */
export function AtlasStrata({ layout, edges, citedVisible, selectedPath, label }: {
  layout: AtlasLayout; edges: AtlasEdge[]; citedVisible: boolean; selectedPath?: string; label: string;
}) {
  const w = layout.cols * CELL + PAD * 2;
  const h = layout.layers.length * BAND + PAD;
  const at = (id: string) => {
    const s = layout.slots[id];
    return { x: PAD + s.col * CELL + CELL / 2, y: PAD + s.layer * BAND + LABEL + s.row * CELL + CELL / 2 };
  };
  const cited = citedVisible ? new Set(edges.flatMap((e) => [e.from, e.to])) : new Set<string>();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="block w-full max-w-[640px] rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-950">
      {layout.layers.map((l, i) => (
        <g key={l.id}>
          <rect x={PAD / 2} y={PAD + i * BAND - 4} width={w - PAD} height={BAND - 8} fill={i % 2 ? "var(--nv-graphite-800)" : "var(--nv-graphite-850)"} stroke="var(--nv-graphite-600)" strokeWidth={0.5} />
          <text x={PAD} y={PAD + i * BAND + 11} fontSize={8} className="font-nv-mono" fill="var(--nv-ivory-100)">
            {l.name}  {l.fileCount} files{l.hiddenCount && !l.aggregate ? ` (+${l.hiddenCount} not drawn)` : ""}
          </text>
          {l.nodes.map((n) => {
            const p = at(n.id);
            const on = n.id === selectedPath;
            return <rect key={n.id} x={p.x - 4} y={p.y - 4} width={8} height={8} fill={on ? "var(--nv-ivory-50)" : cited.has(n.id) ? "var(--nv-copper-400)" : "var(--nv-ivory-300)"} />;
          })}
        </g>
      ))}
      {citedVisible && drawableEdges(layout, edges).map((e) => {
        const a = at(e.from), b = at(e.to);
        return <line key={`${e.from}>${e.to}>${e.kind}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--nv-copper-400)" strokeWidth={0.8} />;
      })}
    </svg>
  );
}
