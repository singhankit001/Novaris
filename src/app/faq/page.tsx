import { Metadata } from "next";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, FaqList, Page, PageHeader } from "@/components/seo/blocks";
import JsonLdScript from "@/components/JsonLdScript";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import { buildBreadcrumbStructuredData, buildFaqStructuredData } from "@/lib/structured-data";
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

            <Page>
                <PageHeader
                    crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
                    eyebrow="FAQ"
                    title="Frequently asked questions"
                    lead="Answers about analyzing, visualizing, and asking questions about GitHub repositories with Novaris."
                />
                <FaqList items={FAQ_PAGE_ITEMS} />
                <div className="mt-14">
                    <ActionLink href="/" variant="primary" large>Analyze a repository</ActionLink>
                </div>
            </Page>
        </SiteChrome>
    );
}
