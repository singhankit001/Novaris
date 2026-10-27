import type { Metadata } from "next";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import JsonLdScript from "@/components/JsonLdScript";
import s from "@/components/seo/seo.module.css";
import { cn } from "@/components/nv/cn";
import SiteChrome from "@/components/seo/SiteChrome";
import { FaqList, H2, Page, PageHeader } from "@/components/seo/blocks";
import { CubesBackdrop, Limits, Maker, OpenSourceGlobe } from "@/components/experiences/about/about-parts";
import { HowItWorks } from "@/components/experiences/about/how-it-works";
import { FAQ_PAGE_ITEMS } from "@/lib/faq-data";
import { getCanonicalSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = createSeoMetadata({
  title: "About",
  description:
    "Novaris is an open-source, browser-first platform for GitHub repository and developer profile analysis. Built by Ankit Singh (@singhankit001).",
  canonical: "/about",
  ogImage: buildOgImageUrl("marketing", { variant: "about" }),
  ogTitle: "About Novaris - Built by Ankit Singh",
  ogDescription:
    "Learn how Novaris delivers full-context repository analysis, AI code review, and security scanning. Built by Ankit Singh (@singhankit001).",
  keywords: [
    "Novaris",
    "About Novaris",
    "Ankit Singh",
    "@singhankit001",
    "Agentic CAG",
    "GitHub repository analysis",
    "AI code review",
    "repository security scanning",
    "open source developer tools",
  ],
});

const aboutFaqItems = [
  ...FAQ_PAGE_ITEMS.slice(0, 3),
  {
    question: "Who built Novaris?",
    answer:
      "Novaris was built by Ankit Singh, a software developer and researcher (GitHub @singhankit001).",
  },
];

export default function AboutPage() {
  const baseUrl = getCanonicalSiteUrl();
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Ankit Singh",
    description: "Software developer and creator of Novaris.",
    sameAs: ["https://github.com/singhankit001", "https://www.linkedin.com/in/singhankit001/"],
    url: `${baseUrl}/about`,
  };
  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Novaris",
    url: `${baseUrl}/about`,
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "Novaris",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: baseUrl,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      creator: {
        "@type": "Person",
        name: "Ankit Singh",
      },
    },
  };

  return (
    <SiteChrome>
      <Page wide>
        <CubesBackdrop>
          <PageHeader
            crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
            eyebrow="Open source · novaris.in"
            title="About Novaris"
            lead="Novaris is an open-source web tool that reads public GitHub repositories and developer profiles and answers questions about them, naming the files it used."
          />
        </CubesBackdrop>

        <div className={cn(s.stack, "mt-16")}>
          <HowItWorks />
          <Limits />
          <OpenSourceGlobe />
          <Maker />
          <section aria-labelledby="ab-faq-h" className={s.grid12}>
            <div className={cn(s.leftWide, s.stickyLeft)}>
              <H2 id="ab-faq-h">Common questions</H2>
            </div>
            <div className={s.rightFrom7}>
              <FaqList items={aboutFaqItems} />
            </div>
          </section>
        </div>
      </Page>
      <JsonLdScript data={personSchema} />
      <JsonLdScript data={aboutSchema} />
    </SiteChrome>
  );
}
