import type { Metadata } from "next";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import JsonLdScript from "@/components/JsonLdScript";
import s from "@/components/seo/seo.module.css";
import { cn } from "@/components/nv/cn";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, BulletList, FaqList, H2, Page, PageHeader, Prose } from "@/components/seo/blocks";
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
        <PageHeader
          crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
          eyebrow="Open source · novaris.in"
          title="About Novaris"
          lead="Novaris is an open-source web tool that reads public GitHub repositories and developer profiles and answers questions about them, naming the files it used."
        />

        <div className={s.stack}>
          <section aria-labelledby="ab-does-h" className={s.grid12}>
            <div className={cn(s.leftWide, s.stickyLeft)}>
              <H2 id="ab-does-h">What it does</H2>
            </div>
            <div className={s.rightFrom7}>
              <Prose>
                <p>
                  You give it a repository URL, <code>owner/repo</code>, or a GitHub username. Novaris fetches public data
                  through the GitHub API, picks the complete files relevant to your question, and sends them to Google Gemini to
                  produce an answer, an architecture diagram, or a security review.
                </p>
              </Prose>
              <div className="mt-5">
                <BulletList
                  items={[
                    "Architecture and dependency questions answered from whole files, not fragments.",
                    "Quick security scans for everyone, deeper scans for signed-in users.",
                    "Reports you can revisit for 7 days.",
                  ]}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="ab-not-h" className={s.grid12}>
            <div className={cn(s.leftWide, s.stickyLeft)}>
              <H2 id="ab-not-h">What it does not do</H2>
            </div>
            <div className={s.rightFrom7}>
              <BulletList
                items={[
                  "It does not clone or run your code.",
                  "It does not rank developers or score people.",
                  "It cannot guarantee a model answer is correct. Check the cited files.",
                  "It reads private repositories only when you grant GitHub access.",
                ]}
              />
            </div>
          </section>

          <section aria-labelledby="ab-who-h" className={s.grid12}>
            <div className={cn(s.leftWide, s.stickyLeft)}>
              <H2 id="ab-who-h">Who built it</H2>
            </div>
            <div className={s.rightFrom7}>
              <Prose>
                <p>
                  Novaris is built by{" "}
                  <a href="https://www.linkedin.com/in/singhankit001/" target="_blank" rel="noopener noreferrer">
                    Ankit Singh
                  </a>{" "}
                  (GitHub <a href="https://github.com/singhankit001" target="_blank" rel="noopener noreferrer">@singhankit001</a>), a software developer.
                  It started as a personal project to understand unfamiliar repositories faster.
                </p>
              </Prose>
              <div className="mt-6 flex flex-wrap gap-3">
                <ActionLink href="/" variant="primary">Try Novaris</ActionLink>
                <ActionLink href="https://github.com/singhankit001/novaris" external>View source</ActionLink>
              </div>
            </div>
          </section>

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
