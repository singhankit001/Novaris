import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";
import { BreadthDepth } from "@/components/experiences/comparisons/breadth-depth";
import { getSeoPageMetadata, getSeoPageOrThrow } from "@/lib/seo-page-route";

const slug = "novaris-vs-snyk";

export const metadata: Metadata = getSeoPageMetadata(slug);

export default function NovarisVsSnykPage() {
  const page = getSeoPageOrThrow(slug);
  const table = page.comparisonTable;
  return <SeoLandingPage page={page} experience={table ? <BreadthDepth table={table} /> : undefined} />;
}
