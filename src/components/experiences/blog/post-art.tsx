/** Quiet deterministic illustration seeded from a slug: a row of stepped file bars. Decorative. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const FILLS = ["var(--nv-copper-wash)", "var(--nv-violet-wash)", "var(--nv-ion-wash)"];
const STROKES = ["var(--nv-copper-400)", "var(--nv-violet-400)", "var(--nv-graphite-500)"];

export function PostArt({ seed, className }: { seed: string; className?: string }) {
  const rnd = seeded(seed || "novaris");
  const bars = Array.from({ length: 9 }, (_, i) => {
    const h = 30 + Math.floor(rnd() * 90);
    const k = Math.floor(rnd() * 3);
    return { x: 14 + i * 34, h, k };
  });
  return (
    <svg viewBox="0 0 330 160" role="presentation" aria-hidden className={className} preserveAspectRatio="xMidYMid slice">
      <rect width="330" height="160" fill="var(--nv-graphite-850)" />
      {bars.map((b) => (
        <rect
          key={b.x}
          x={b.x}
          y={150 - b.h}
          width="26"
          height={b.h}
          rx="6"
          fill={FILLS[b.k]}
          stroke={STROKES[b.k]}
          strokeWidth="1.25"
        />
      ))}
    </svg>
  );
}
