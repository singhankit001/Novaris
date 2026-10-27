import type { Metadata } from "next";
import SiteChrome from "@/components/seo/SiteChrome";
import { Page, PageHeader, Prose } from "@/components/seo/blocks";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Terms of Service",
  description: "Terms of service for using Novaris responsibly and in compliance with applicable laws and platform policies.",
  canonical: "/terms",
  ogImage: buildOgImageUrl("marketing", { variant: "terms" }),
  ogTitle: "Terms of Service",
  ogDescription: "Terms of service for using Novaris responsibly and in compliance with applicable laws and platform policies.",
});

export default function TermsPage() {
  return (
    <SiteChrome>
      <Page>
        <PageHeader eyebrow="Legal" title="Terms of Service" />
        <Prose>
          <p>
            By using Novaris, you agree to use the service responsibly and in compliance with applicable laws and platform policies.
          </p>
          <p>We may update features, limits, and policies over time to improve quality and security.</p>
          <p>
            If you have questions regarding these terms, contact <a href="mailto:singhankit91624@gmail.com">singhankit91624@gmail.com</a>.
          </p>
        </Prose>
      </Page>
    </SiteChrome>
  );
}
