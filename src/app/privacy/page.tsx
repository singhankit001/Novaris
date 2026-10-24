import type { Metadata } from "next";
import SiteChrome from "@/components/seo/SiteChrome";
import { Page, PageHeader, Prose } from "@/components/seo/blocks";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Privacy Policy",
  description: "How Novaris handles account data, usage analytics, authentication, and scan-related information.",
  canonical: "/privacy",
  ogImage: buildOgImageUrl("marketing", { variant: "privacy" }),
  ogTitle: "Privacy Policy",
  ogDescription: "How Novaris handles account data, usage analytics, authentication, and scan-related information.",
});

export default function PrivacyPage() {
  return (
    <SiteChrome>
      <Page>
        <PageHeader eyebrow="Legal" title="Privacy Policy" />
        <Prose>
          <p>
            Novaris respects your privacy. We only collect data required to operate the product and improve reliability.
          </p>
          <p>
            Usage analytics, authentication details, and account-related metadata may be processed to provide features and support.
          </p>
          <p>
            For data-related requests, contact us at <a href="mailto:singhankit91624@gmail.com">singhankit91624@gmail.com</a>.
          </p>
        </Prose>
      </Page>
    </SiteChrome>
  );
}
