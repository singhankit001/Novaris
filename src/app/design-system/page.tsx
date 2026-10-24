import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/nv/nav";
import { ControlsSections } from "./sections-controls";
import { DataSections } from "./sections-data";
import { FoundationSections } from "./sections-foundation";
import { OverlaySections } from "./sections-overlays";
import { StateSections } from "./sections-states";

export const metadata: Metadata = { title: "Design workbench", robots: { index: false, follow: false } };

const toc = [["color", "Color"], ["type", "Type"], ["space", "Space"], ["grid", "Grid"], ["motion", "Motion"], ["buttons", "Buttons"], ["inputs", "Inputs"], ["tabs-menu", "Tabs"], ["dialogs", "Dialogs"], ["navigation", "Navigation"], ["evidence", "Evidence"], ["data", "Data"], ["code", "Code"], ["states", "States"]];

export default function Page() {
  if (process.env.NODE_ENV === "production" && process.env.NOVARIS_WORKBENCH !== "1") notFound();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-nv-graphite-700 bg-nv-graphite-950/95">
        <a href="#nv-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-nv-ivory-100 focus:px-3 focus:py-2 focus:text-nv-graphite-950">Skip to content</a>
        <div className="mx-auto flex max-w-[var(--nv-page-max)] items-center gap-6 px-[var(--nv-gutter)] py-2">
          <Wordmark />
          <nav aria-label="Workbench sections" className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none]">
            {toc.map(([id, l]) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 shrink-0 items-center rounded-nv-sm px-3 text-nv-small text-nv-ivory-200 hover:text-nv-ivory-50">{l}</a>)}
          </nav>
        </div>
      </header>
      <main id="nv-main" tabIndex={-1} className="mx-auto max-w-[var(--nv-page-max)] px-[var(--nv-gutter)] pb-24">
        <div className="py-16 md:py-24">
          <p className="nv-eyebrow !text-nv-copper-300">Design workbench · internal</p>
          <h1 className="nv-display mt-4 max-w-4xl text-nv-display-xl">The precision engineering observatory.</h1>
          <p className="mt-6 max-w-[var(--nv-measure)] text-lg text-nv-ivory-200">Every primitive, token and state of the Novaris foundation. Tab through the page: every control has a visible focus ring.</p>
        </div>
        <FoundationSections />
        <ControlsSections />
        <OverlaySections />
        <DataSections />
        <StateSections />
      </main>
    </>
  );
}
