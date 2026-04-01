import { describe, expect, it } from "vitest";
import { metadata as aboutMetadata } from "./about/page";
import { metadata as faqMetadata } from "./faq/page";
import { metadata as privacyMetadata } from "./privacy/page";
import { metadata as termsMetadata } from "./terms/page";
import { generateMetadata as generateComingSoonMetadata } from "./coming-soon/page";

describe("public information page metadata", () => {
    it("adds branded OG previews to the about page", () => {
        expect(aboutMetadata.title).toBe("About");
        const ogImages = aboutMetadata.openGraph?.images as { url?: string }[] | undefined;
        expect(ogImages?.[0]?.url).toBe("/og/about.png");
    });

    it("adds branded OG previews to the FAQ page", () => {
        expect(faqMetadata.title).toBe("FAQ");
        const ogImages = faqMetadata.openGraph?.images as { url?: string }[] | undefined;
        expect(ogImages?.[0]?.url).toBe("/og/faq.png");
    });

    it("adds branded OG previews to privacy and terms pages", () => {
        expect(privacyMetadata.title).toBe("Privacy Policy");
        const privacyOgImages = privacyMetadata.openGraph?.images as { url?: string }[] | undefined;
        expect(privacyOgImages?.[0]?.url).toBe("/og/privacy.png");

        expect(termsMetadata.title).toBe("Terms of Service");
        const termsOgImages = termsMetadata.openGraph?.images as { url?: string }[] | undefined;
        expect(termsOgImages?.[0]?.url).toBe("/og/terms.png");
    });

    it("builds a dynamic coming soon card for the requested feature", async () => {
        const metadata = await generateComingSoonMetadata({
            searchParams: Promise.resolve({ feature: "security-scanner" }),
        });

        expect(metadata.title).toBe("Security Scanner Coming Soon");
        const robots = metadata.robots as { index?: boolean } | undefined;
        const ogImages = metadata.openGraph?.images as { url?: string }[] | undefined;
        expect(robots?.index).toBe(false);
        expect(ogImages?.[0]?.url).toBe("/og/coming-soon.png");
    });
});
