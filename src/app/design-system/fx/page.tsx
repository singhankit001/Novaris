import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/nv/nav";
import { codeShowcase } from "@/components/fx/code/showcase";
import { sceneShowcase } from "@/components/fx/scene/showcase";
import { surfaceShowcase } from "@/components/fx/surface/showcase";
import type { ShowcaseEntry } from "@/components/fx/showcase-types";

export const metadata: Metadata = { title: "Interactive components", robots: { index: false, follow: false } };

const groups: { id: string; title: string; entries: ShowcaseEntry[] }[] = [
  { id: "scene", title: "3D and cinematic", entries: sceneShowcase },
  { id: "code", title: "Code and architecture", entries: codeShowcase },
  { id: "surface", title: "Interactions and surfaces", entries: surfaceShowcase },
];

const all = groups.flatMap((g) => g.entries);

/**
 * Development-only gallery of the fx component library. `?only=<id>` renders one entry bare,
 * which the 390px frames use so each component is seen under real phone-width media queries.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ only?: string }> }) {
  const { only } = await searchParams;
  if (only) {
    const entry = all.find((e) => e.id === only);
    if (!entry) notFound();
    return <main className="bg-nv-graphite-950 p-4">{entry.render()}</main>;
  }

  return (
    <>
      <header className="nv-site-header sticky top-0 z-20 border-b border-nv-graphite-700">
        <div className="mx-auto flex max-w-[var(--nv-page-max)] items-center gap-6 px-[var(--nv-gutter)] py-2">
          <Wordmark />
          <nav aria-label="Component groups" className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none]">
            <Link href="/design-system" className="inline-flex min-h-11 shrink-0 items-center rounded-nv-sm px-3 text-nv-small text-nv-ivory-200 hover:text-nv-ivory-50">
              Foundation
            </Link>
            {groups.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="inline-flex min-h-11 shrink-0 items-center rounded-nv-sm px-3 text-nv-small text-nv-ivory-200 hover:text-nv-ivory-50">
                {g.title}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="nv-main" tabIndex={-1} className="mx-auto max-w-[var(--nv-page-max)] px-[var(--nv-gutter)] pb-24">
        <div className="py-16 md:py-24">
          <p className="nv-eyebrow !text-nv-copper-300">Design workbench · internal</p>
          <h1 className="nv-display mt-4 max-w-4xl text-balance text-nv-display-lg">
            Interactive <em>components</em>.
          </h1>
          <p className="mt-6 max-w-[var(--nv-measure)] text-lg text-nv-ivory-200">
            Every component in <code>src/components/fx</code>, with sample data that is illustrative only. Hover and focus each one; tab through to check focus states.
            For the reduced-motion variant, turn on &ldquo;Emulate prefers-reduced-motion: reduce&rdquo; in DevTools Rendering and reload. Each component then shows its final state.
          </p>
        </div>

        {groups.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-20 border-t border-nv-graphite-700 py-16">
            <h2 id={`${g.id}-h`} className="nv-display text-nv-display-md">
              {g.title}
            </h2>
            <div className="mt-10 space-y-20">
              {g.entries.map((entry) => (
                <article key={entry.id} aria-labelledby={`fx-${entry.id}`} className="space-y-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h3 id={`fx-${entry.id}`} className="text-nv-title font-semibold text-nv-ivory-50">
                      {entry.name}
                    </h3>
                    <p className="nv-eyebrow">Ref: {entry.reference}</p>
                  </div>
                  <ul aria-label="Intended routes" className="flex flex-wrap gap-2">
                    {entry.routes.map((r) => (
                      <li key={r} className="rounded-full border border-nv-graphite-700 bg-nv-graphite-900 px-3 py-1 font-nv-mono text-nv-micro text-nv-ivory-200">
                        {r}
                      </li>
                    ))}
                  </ul>
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                    <div className="min-w-0">
                      <p className="mb-2 font-nv-mono text-nv-micro text-nv-graphite-400">Desktop</p>
                      {entry.render()}
                    </div>
                    <div className="min-w-0">
                      <p className="mb-2 font-nv-mono text-nv-micro text-nv-graphite-400">Phone, 390px</p>
                      <iframe
                        title={`${entry.name} at phone width`}
                        src={`/design-system/fx?only=${entry.id}`}
                        loading="lazy"
                        className="h-[640px] w-full max-w-[390px] rounded-nv-lg border border-nv-graphite-700 bg-nv-graphite-950 shadow-nv-card"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
