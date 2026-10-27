import type { SeoComparisonTable } from "@/lib/seo-pages";

/** Two lanes: wide-coverage platform vs. repository-depth read. Text comes from the page's own table; the sample citation is illustrative. */
export function BreadthDepth({ table }: { table: SeoComparisonTable }) {
  const fit = table.rows.find((r) => r.criteria === "Workflow fit") ?? table.rows[0];
  const depth = table.rows.find((r) => r.criteria === "Context depth") ?? table.rows[0];
  if (!fit || !depth) return null;
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <section aria-label={`${table.alternativeLabel}: ${depth.alternative}`} className="nv-card p-6 lg:col-span-3">
        <p className="nv-eyebrow">{table.alternativeLabel}</p>
        <p className="mt-3 max-w-[48ch] text-nv-body leading-relaxed text-nv-ivory-100 text-pretty">{depth.alternative}</p>
        <div aria-hidden className="mt-6 grid grid-cols-8 gap-2 sm:grid-cols-12">
          {Array.from({ length: 24 }, (_, k) => (
            <span key={k} className="aspect-square rounded-md border border-nv-graphite-700 bg-nv-graphite-850" />
          ))}
        </div>
        <p className="mt-4 text-nv-small text-nv-ivory-300">{fit.alternative}</p>
      </section>
      <section aria-label={`${table.novarisLabel}: ${depth.novaris}`} className="nv-card border-nv-copper-700 p-6 lg:col-span-2">
        <p className="nv-eyebrow">{table.novarisLabel}</p>
        <p className="mt-3 text-nv-body leading-relaxed text-nv-ivory-100 text-pretty">{depth.novaris}</p>
        <div aria-hidden className="mt-6 grid gap-2 font-nv-mono text-nv-micro text-nv-ivory-200">
          <span className="rounded-md bg-nv-graphite-850 px-3 py-2">src/auth/session.ts</span>
          <span className="ml-4 rounded-md bg-nv-copper-wash px-3 py-2 text-nv-copper-300">src/db/query.ts</span>
          <span className="ml-8 rounded-md bg-nv-graphite-850 px-3 py-2">src/routes/login.ts</span>
        </div>
        <p className="mt-4 text-nv-small text-nv-ivory-300">{fit.novaris}</p>
        <p className="mt-3 text-nv-micro text-nv-text-muted">File names are an illustrative sample.</p>
      </section>
    </div>
  );
}
