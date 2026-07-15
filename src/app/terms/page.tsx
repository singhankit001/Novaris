import type { Metadata } from "next";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Terms of Service",
  description: "Terms of service for using Novaris responsibly and in compliance with applicable laws and platform policies.",
  canonical: "/terms",
  ogImage: buildOgImageUrl("marketing", { variant: "terms" }),
  ogTitle: "Terms of Service",
  ogDescription: "Terms of service for using Novaris responsibly and in compliance with applicable laws and platform policies.",
});

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-transparent text-white px-6 py-20 relative z-10">
      <div className="absolute inset-0 premium-grid opacity-25 pointer-events-none z-0" />
      <div className="absolute inset-0 premium-radial pointer-events-none z-0" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Terms of Service</h1>
        <p className="text-zinc-300 leading-relaxed mb-4">
          By using Novaris, you agree to use the service responsibly and in compliance with applicable laws and platform policies.
        </p>
        <p className="text-zinc-200 leading-relaxed mb-4">
          We may update features, limits, and policies over time to improve quality and security.
        </p>
        <p className="text-zinc-200 leading-relaxed">
          If you have questions regarding these terms, contact <a href="mailto:singhankit91624@gmail.com" className="text-blue-300 hover:text-blue-200">singhankit91624@gmail.com</a>.
        </p>
      </div>
    </main>
  );
}
