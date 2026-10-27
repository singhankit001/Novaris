import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";
import { CriteriaLayers } from "@/components/experiences/comparisons/criteria-layers";
import { getSeoPageMetadata, getSeoPageOrThrow } from "@/lib/seo-page-route";

const slug = "novaris-vs-sonarqube";

export const metadata: Metadata = getSeoPageMetadata(slug);

export default function NovarisVsSonarqubePage() {
  const page = getSeoPageOrThrow(slug);
  const table = page.comparisonTable;
  return <SeoLandingPage page={page} experience={table ? <CriteriaLayers table={table} /> : undefined} />;
}
