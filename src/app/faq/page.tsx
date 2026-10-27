import { Metadata } from "next";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, Page, PageHeader } from "@/components/seo/blocks";
import JsonLdScript from "@/components/JsonLdScript";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import { buildBreadcrumbStructuredData, buildFaqStructuredData } from "@/lib/structured-data";
import { FaqAccordion } from "@/components/experiences/faq/faq-accordion";
import { FAQ_PAGE_ITEMS } from "@/lib/faq-data";

export const metadata: Metadata = createSeoMetadata({
    title: "FAQ",
    description: "Frequently asked questions about Novaris's Agentic CAG, GitHub repository analysis, architecture visualization, and security scanning.",
    canonical: "/faq",
    ogImage: buildOgImageUrl("marketing", { variant: "faq" }),
    ogTitle: "Novaris FAQ",
    ogDescription: "Frequently asked questions about Novaris's repository analysis and security scanning.",
});

export default function FAQPage() {
    const faqSchema = buildFaqStructuredData(FAQ_PAGE_ITEMS.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
    })));
    const breadcrumbSchema = buildBreadcrumbStructuredData([
        { name: "Home", path: "/" },
        { name: "FAQ", path: "/faq" },
    ]);

    return (
        <SiteChrome current="/faq">
            <JsonLdScript data={faqSchema} />
            <JsonLdScript data={breadcrumbSchema} />

            <Page wide>
                <PageHeader
                    crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
                    eyebrow="FAQ"
                    title="Frequently asked questions"
                    lead="Answers about analyzing, visualizing, and asking questions about GitHub repositories with Novaris."
                />
                <div className="grid gap-12 lg:grid-cols-12">
                    <aside className="lg:col-span-4">
                        <div className="lg:sticky lg:top-28">
                            <p className="max-w-[34ch] text-nv-body leading-relaxed text-nv-ivory-200 text-pretty">
                                Short answers, all on one page. Open one, or expand them all.
                            </p>
                            <div className="mt-6">
                                <ActionLink href="/" variant="primary" large>Analyze a repository</ActionLink>
                            </div>
                        </div>
                    </aside>
                    <div className="min-w-0 lg:col-span-8">
                        <FaqAccordion items={FAQ_PAGE_ITEMS} />
                    </div>
                </div>
            </Page>
        </SiteChrome>
    );
}
