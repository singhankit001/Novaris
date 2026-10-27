import type { Metadata } from "next";
import { OssScannerExperience } from "@/components/experiences/oss-scanner/oss-scanner-experience";
import SeoLandingPage from "@/components/seo/SeoLandingPage";
import { getSeoPageMetadata, getSeoPageOrThrow } from "@/lib/seo-page-route";

const slug = "open-source-security-scanner";

export const metadata: Metadata = getSeoPageMetadata(slug);

export default function OpenSourceSecurityScannerPage() {
  return <SeoLandingPage page={getSeoPageOrThrow(slug)} heroAlign="start" experience={<OssScannerExperience />} />;
}
