import type { Metadata } from "next";
import { NodejsScannerExperience } from "@/components/experiences/nodejs-scanner/nodejs-scanner-experience";
import SeoLandingPage from "@/components/seo/SeoLandingPage";
import { getSeoPageMetadata, getSeoPageOrThrow } from "@/lib/seo-page-route";

const slug = "nodejs-security-scanner";

export const metadata: Metadata = getSeoPageMetadata(slug);

export default function NodeJsSecurityScannerPage() {
  return <SeoLandingPage page={getSeoPageOrThrow(slug)} heroAlign="start" experience={<NodejsScannerExperience />} />;
}
