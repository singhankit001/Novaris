import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";
import { getSeoPageMetadata, getSeoPageOrThrow } from "@/lib/seo-page-route";

const slug = "static-analysis-vs-novaris";

export const metadata: Metadata = getSeoPageMetadata(slug);

export default function StaticAnalysisVsNovarisPage() {
  return <SeoLandingPage page={getSeoPageOrThrow(slug)} />;
}
