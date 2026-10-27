import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";
import { ReadModeDemo } from "@/components/experiences/comparisons/read-mode-demo";
import { getSeoPageMetadata, getSeoPageOrThrow } from "@/lib/seo-page-route";

const slug = "static-analysis-vs-novaris";

export const metadata: Metadata = getSeoPageMetadata(slug);

export default function StaticAnalysisVsNovarisPage() {
  const page = getSeoPageOrThrow(slug);
  const table = page.comparisonTable;
  return <SeoLandingPage page={page} experience={<ReadModeDemo />} />;
}
