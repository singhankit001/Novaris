import s from "./building-cubes.module.css";

/** One cube as three faces (top, left, right) centred on (cx, cy), half-width w. */
function Cube({ cx, cy, w, i }: { cx: number; cy: number; w: number; i: number }) {
  const h = w / 2;
  return (
    <g className={s.cube} style={{ "--i": i } as React.CSSProperties}>
      <polygon points={`${cx},${cy - w} ${cx + w},${cy - h} ${cx},${cy} ${cx - w},${cy - h}`} fill="var(--nv-ion-wash)" stroke="var(--nv-copper-400)" strokeWidth="1.5" />
      <polygon points={`${cx - w},${cy - h} ${cx},${cy} ${cx},${cy + w} ${cx - w},${cy + h}`} fill="var(--nv-graphite-850)" stroke="var(--nv-graphite-500)" strokeWidth="1.5" />
      <polygon points={`${cx + w},${cy - h} ${cx},${cy} ${cx},${cy + w} ${cx + w},${cy + h}`} fill="var(--nv-violet-wash)" stroke="var(--nv-violet-400)" strokeWidth="1.5" />
    </g>
  );
}

/** The page's single animation: cubes settling into a stack. Static under reduced motion. */
export function BuildingCubes() {
  return (
    <svg viewBox="0 0 240 200" role="presentation" aria-hidden className="mx-auto h-auto w-full max-w-[220px]">
      <ellipse className={s.glow} cx="120" cy="170" rx="80" ry="14" fill="var(--nv-copper-wash)" />
      <Cube cx={84} cy={150} w={36} i={0} />
      <Cube cx={156} cy={150} w={36} i={1} />
      <Cube cx={120} cy={92} w={36} i={2} />
    </svg>
  );
}
