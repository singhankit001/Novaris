/** Static SVG globe: server-rendered, same footprint as the WebGL scene. Decorative. */
export function GlobeFallback() {
  const lat = [-60, -30, 0, 30, 60];
  return (
    <svg viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <circle r={88} fill="var(--nv-surface)" stroke="var(--nv-hairline)" />
      {lat.map((l) => {
        const y = Math.sin((l * Math.PI) / 180) * 88;
        const rx = Math.cos((l * Math.PI) / 180) * 88;
        return <ellipse key={l} cx={0} cy={y} rx={rx} ry={rx * 0.14} fill="none" stroke="var(--nv-border)" strokeDasharray="1 4" strokeLinecap="round" />;
      })}
      <ellipse rx={40} ry={88} fill="none" stroke="var(--nv-border)" strokeDasharray="1 4" strokeLinecap="round" />
      <path d="M -60 -20 Q 0 -90 55 -10" fill="none" stroke="var(--nv-copper-400)" strokeWidth={1.2} />
      <path d="M -40 30 Q 10 -30 62 28" fill="none" stroke="var(--nv-violet-400)" strokeWidth={1.2} />
    </svg>
  );
}
