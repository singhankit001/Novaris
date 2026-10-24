import Link from "next/link";
import JsonLdScript from "@/components/JsonLdScript";
import SeoVisual from "@/components/seo/SeoVisual";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, BulletList, CtaBand, FaqList, H2, Page, PageHeader, Prose } from "@/components/seo/blocks";
import { cn } from "@/components/nv/cn";
import s from "./seo.module.css";
import { Notice } from "@/components/nv/notice";
import { DataTable } from "@/components/nv/data";
import type { SeoComparisonTableRow, SeoInternalLink, SeoPageDefinition } from "@/lib/seo-pages";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/lib/structured-data";

type SeoLandingPageProps = {
  page: SeoPageDefinition;
};

function InternalLinks({ links }: { links: SeoInternalLink[] }) {
  if (links.length === 0) return null;

  return (
    <ul className={s.internal}>
      {links.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <Link href={link.href} className={s.internalLink}>
            <strong>{link.label}</strong>
            <span>{link.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SeoLandingPage({ page }: SeoLandingPageProps) {
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Explore", path: "/explore" },
    { name: page.h1, path: `/${page.slug}` },
  ];

  const breadcrumbSchema = buildBreadcrumbStructuredData(breadcrumbItems);
  const faqSchema = buildFaqStructuredData(page.faq);
  const softwareSchema = buildSoftwareApplicationStructuredData({
    name: `Novaris ${page.title}`,
    description: page.metaDescription,
    path: `/${page.slug}`,
    featureList: page.sections.flatMap((section) => [
      section.title,
      ...(section.subsections?.map((subsection) => subsection.title) ?? []),
    ]),
  });
  const table = page.comparisonTable;

  return (
    <SiteChrome current="/compare">
      {page.schemaTypes.includes("SoftwareApplication") && <JsonLdScript data={softwareSchema} />}
      {page.schemaTypes.includes("FAQPage") && <JsonLdScript data={faqSchema} />}
      {page.schemaTypes.includes("BreadcrumbList") && <JsonLdScript data={breadcrumbSchema} />}

      <Page wide>
        <PageHeader
          crumbs={[{ label: "Home", href: "/" }, { label: "Explore", href: "/explore" }, { label: page.title }]}
          eyebrow={page.primaryIntent}
          title={page.h1}
          lead={page.lead}
        />

        <section aria-label="Workflow illustration" className="mb-24 max-w-5xl">
          <SeoVisual variant={page.visualVariant} ariaLabel={`${page.title} workflow, illustrative`} />
        </section>

        <div className={s.stack}>
          {page.sections.map((section) => (
            <section key={section.title} className={s.grid12}>
              <div className={cn(s.left, s.stickyLeft)}>
                <H2>{section.title}</H2>
              </div>
              <div className={s.right}>
                <Prose>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </Prose>
                {section.bullets && section.bullets.length > 0 && (
                  <div className="mt-5 max-w-[var(--nv-measure)]">
                    <BulletList items={section.bullets} />
                  </div>
                )}
                {section.subsections && section.subsections.length > 0 && (
                  <div className="mt-10 space-y-8">
                    {section.subsections.map((subsection) => (
                      <section key={`${section.title}-${subsection.title}`} className={s.sub}>
                        <h3 className={s.subTitle}>{subsection.title}</h3>
                        <Prose>
                          {subsection.paragraphs.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                        </Prose>
                        {subsection.bullets && subsection.bullets.length > 0 && (
                          <div className="mt-4 max-w-[var(--nv-measure)]">
                            <BulletList items={subsection.bullets} />
                          </div>
                        )}
                        {subsection.internalLinks && <InternalLinks links={subsection.internalLinks} />}
                      </section>
                    ))}
                  </div>
                )}
                {section.internalLinks && <InternalLinks links={section.internalLinks} />}
              </div>
            </section>
          ))}

          {table && (
            <section aria-labelledby="seo-compare-h" className={s.grid12}>
              <div className={cn(s.left, s.stickyLeft)}>
                <H2 id="seo-compare-h">{table.title}</H2>
              </div>
              <div className={cn(s.rightFrom5, "min-w-0 space-y-5")}>
                <Prose>
                  <p>{table.caption}</p>
                </Prose>
                <Notice tone="info" title="Editorial comparison">
                  Written by Novaris from public documentation. It is not a benchmark. Check each vendor&apos;s current docs before deciding.
                </Notice>
                <DataTable<SeoComparisonTableRow>
                  caption={table.title}
                  rowKey={(row) => `${page.slug}-${row.criteria}`}
                  rows={table.rows}
                  columns={[
                    { key: "criteria", header: "Criteria", render: (r) => <span className="font-medium">{r.criteria}</span> },
                    { key: "novaris", header: table.novarisLabel, render: (r) => r.novaris, className: "min-w-56 text-nv-ivory-200" },
                    { key: "alt", header: table.alternativeLabel, render: (r) => r.alternative, className: "min-w-56 text-nv-ivory-200" },
                  ]}
                />
                <div>
                  <h3 className={s.subTitle}>Key differences</h3>
                  <div className="max-w-[var(--nv-measure)]">
                    <BulletList items={table.differentiators} />
                  </div>
                </div>
              </div>
            </section>
          )}

          <section aria-labelledby="seo-faq-h" className={s.grid12}>
            <div className={cn(s.left, s.stickyLeft)}>
              <H2 id="seo-faq-h">Frequently asked questions</H2>
            </div>
            <div className={s.rightFrom5}>
              <FaqList items={page.faq} />
            </div>
          </section>

          <CtaBand id="seo-next-h" title={<>Next <em>step</em></>} text="Continue with the workflow that matches your question.">
            {page.ctaTargets.map((cta) => (
              <ActionLink key={`${page.slug}-${cta.href}-${cta.label}`} href={cta.href} variant={cta.style === "primary" ? "primary" : "secondary"} large>
                {cta.label}
              </ActionLink>
            ))}
          </CtaBand>
        </div>
      </Page>
    </SiteChrome>
  );
}
