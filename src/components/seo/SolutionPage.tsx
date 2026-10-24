import JsonLdScript from "@/components/JsonLdScript";
import SeoVisual, { type SeoVisualVariant } from "@/components/seo/SeoVisual";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, CtaBand, FaqList, H2, LinkRow, Page, PageHeader, Prose, Rows } from "@/components/seo/blocks";
import { cn } from "@/components/nv/cn";
import s from "./seo.module.css";

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

        <section aria-label="Workflow illustration" className="mb-24 max-w-5xl">
          <SeoVisual variant={p.visual.variant} ariaLabel={p.visual.ariaLabel} />
        </section>

        <div className={s.stack}>
          <section aria-labelledby="sol-main-h" className={s.grid12}>
            <div className={cn(s.leftWide, s.stickyLeft)}>
              <H2 id="sol-main-h">{p.mainTitle}</H2>
            </div>
            <div className={s.rightFrom7}>
              <Prose>
                <p>{p.mainIntro}</p>
              </Prose>
              <div className="mt-6 space-y-6">
                {p.subsections.map((sub) => (
                  <div key={sub.title} className={s.sub}>
                    <h3 className={s.subTitle}>{sub.title}</h3>
                    <Prose>
                      <p>{sub.text}</p>
                    </Prose>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section aria-label="Use cases" className={s.cols2}>
            {p.cards.map((card) => (
              <div key={card.title} className={s.col2Item}>
                <h2 className={s.col2Title}>{card.title}</h2>
                <p className={s.col2Text}>{card.text}</p>
              </div>
            ))}
          </section>

          <section aria-labelledby="sol-related-h" className={s.grid12}>
            <div className={cn(s.leftWide, s.stickyLeft)}>
              <H2 id="sol-related-h">{p.relatedTitle}</H2>
            </div>
            <div className={s.rightFrom7}>
              <Rows>
                {p.related.map((r) => (
                  <LinkRow key={r.href} href={r.href} title={r.label} />
                ))}
              </Rows>
            </div>
          </section>

          <section aria-labelledby="sol-faq-h" className={s.grid12}>
            <div className={cn(s.leftWide, s.stickyLeft)}>
              <H2 id="sol-faq-h">Frequently asked questions</H2>
            </div>
            <div className={s.rightFrom7}>
              <FaqList items={p.faqItems} />
            </div>
          </section>

          <CtaBand id="sol-next-h" title={<>Next <em>step</em></>} text={p.nextText}>
            {p.ctas.map((c) => (
              <ActionLink key={c.href} href={c.href} variant={c.primary ? "primary" : "secondary"} large>
                {c.label}
              </ActionLink>
            ))}
          </CtaBand>
        </div>
      </Page>
    </SiteChrome>
  );
}
