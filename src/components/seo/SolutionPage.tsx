import JsonLdScript from "@/components/JsonLdScript";
import SeoVisual, { type SeoVisualVariant } from "@/components/seo/SeoVisual";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, FaqList, H2, LinkRow, Page, PageHeader, Prose } from "@/components/seo/blocks";

export interface SolutionPageProps {
  crumbTitle: string;
  h1: string;
  lead: [string, string];
  visual: { variant: SeoVisualVariant; ariaLabel: string };
  mainTitle: string;
  mainIntro: string;
  subsections: { title: string; text: string }[];
  cards: { title: string; text: string }[];
  relatedTitle: string;
  related: { href: string; label: string }[];
  faqItems: { question: string; answer: string }[];
  nextText: string;
  ctas: { href: string; label: string; primary?: boolean }[];
  /** Pre-built JSON-LD documents (breadcrumb, FAQ, software application). */
  schemas: unknown[];
}

/** Shared layout for the three solution landing pages: copy and metadata stay in each route file. */
export default function SolutionPage(p: SolutionPageProps) {
  return (
    <SiteChrome current="/solutions">
      {p.schemas.map((schema, i) => (
        <JsonLdScript key={i} data={schema} />
      ))}
      <Page wide>
        <PageHeader
          crumbs={[{ label: "Home", href: "/" }, { label: "Solutions", href: "/solutions" }, { label: p.crumbTitle }]}
          eyebrow="Solution"
          title={p.h1}
          lead={p.lead[0]}
        >
          <Prose className="mt-4">
            <p>{p.lead[1]}</p>
          </Prose>
        </PageHeader>

        <section aria-label="Workflow illustration" className="mb-16 max-w-4xl">
          <SeoVisual variant={p.visual.variant} ariaLabel={p.visual.ariaLabel} />
        </section>

        <div className="space-y-14 md:space-y-20">
          <section aria-labelledby="sol-main-h" className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <H2 id="sol-main-h">{p.mainTitle}</H2>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <Prose>
                <p>{p.mainIntro}</p>
              </Prose>
              <div className="mt-6 space-y-6">
                {p.subsections.map((s) => (
                  <div key={s.title} className="border-t border-nv-graphite-700 pt-4">
                    <h3 className="mb-2 text-nv-title font-medium text-nv-ivory-50">{s.title}</h3>
                    <Prose>
                      <p>{s.text}</p>
                    </Prose>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section aria-label="Use cases" className="grid gap-x-10 gap-y-0 border-t border-nv-graphite-700 md:grid-cols-2">
            {p.cards.map((card) => (
              <div key={card.title} className="border-b border-nv-graphite-700 py-6 md:pr-6 md:even:border-l md:even:pl-6">
                <h2 className="text-nv-title font-medium text-nv-ivory-50">{card.title}</h2>
                <p className="mt-2 max-w-[var(--nv-measure)] text-pretty text-nv-body text-nv-ivory-200">{card.text}</p>
              </div>
            ))}
          </section>

          <section aria-labelledby="sol-related-h" className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <H2 id="sol-related-h">{p.relatedTitle}</H2>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <div className="border-t border-nv-graphite-700">
                {p.related.map((r) => (
                  <LinkRow key={r.href} href={r.href} title={r.label} />
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="sol-faq-h" className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <H2 id="sol-faq-h">Frequently asked questions</H2>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <FaqList items={p.faqItems} />
            </div>
          </section>

          <section aria-labelledby="sol-next-h" className="border-t border-nv-copper-600 pt-8">
            <H2 id="sol-next-h">Next step</H2>
            <p className="mt-3 max-w-[var(--nv-measure)] text-nv-body text-nv-ivory-200">{p.nextText}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {p.ctas.map((c) => (
                <ActionLink key={c.href} href={c.href} variant={c.primary ? "primary" : "secondary"}>
                  {c.label}
                </ActionLink>
              ))}
            </div>
          </section>
        </div>
      </Page>
    </SiteChrome>
  );
}
