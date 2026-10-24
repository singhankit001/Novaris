"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Mail } from "lucide-react";
import { Wordmark } from "@/components/nv/nav";
import { Dialog } from "@/components/nv/dialog";
import { Button } from "@/components/nv/button";
import { buttonClasses } from "@/components/nv/button-styles";
import { Notice } from "@/components/nv/notice";

export const footerLinks = {
    explore: [
        { name: "Solutions", href: "/solutions" },
        { name: "Compare", href: "/compare" },
        { name: "Insights", href: "/blog" },
        { name: "Trending", href: "/trending" },
        { name: "Explore pages", href: "/explore" },
        { name: "FAQ", href: "/faq" },
    ],
    company: [
        { name: "About", href: "/about" },
        { name: "Privacy", href: "/privacy" },
        { name: "Terms", href: "/terms" },
    ],
    product: [
        { name: "Repository Analysis", href: "/github-repository-analysis" },
        { name: "AI Code Review Tool", href: "/ai-code-review-tool" },
        { name: "Security Scanner", href: "/security-scanner" },
    ],
    media: [
        { name: "Source on GitHub", href: "https://github.com/singhankit001/novaris" },
        { name: "YouTube demo", href: "https://www.youtube.com/watch?v=3f66xlgpjw0" },
        { name: "StartupAsRadar listing", href: "https://www.startupasradar.com/startup/3648" },
        { name: "BuiltAtLightSpeed listing", href: "https://www.builtatlightspeed.com/theme/singhankit001-novaris" },
    ],
};

const CONTACT_EMAIL = "singhankit91624@gmail.com";
const linkClass = "nv-footer-link inline-flex min-h-11 items-center text-nv-small text-nv-ivory-200 hover:text-nv-ivory-50";

export default function Footer() {
    const [isOpen, setIsOpen] = useState(false);
    const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(CONTACT_EMAIL);
            setCopyState("copied");
        } catch {
            setCopyState("failed");
        }
    };

    return (
        <footer className="border-t border-nv-graphite-700 bg-nv-graphite-900">
            <div className="mx-auto grid max-w-[var(--nv-page-max)] gap-10 px-[var(--nv-gutter)] py-16 md:grid-cols-[1.3fr_repeat(4,1fr)]">
                <div className="max-w-xs">
                    <Link href="/" aria-label="Novaris home" className="inline-block rounded-nv-sm">
                        <Wordmark />
                    </Link>
                    <p className="mt-3 text-nv-small text-nv-ivory-300">
                        A clearer view of your code. Explore repositories, understand architecture, and discover what to build next.
                    </p>
                </div>
                {(
                    [
                        ["Explore", footerLinks.explore],
                        ["Product", footerLinks.product],
                        ["Company", footerLinks.company],
                    ] as const
                ).map(([title, links]) => (
                    <nav key={title} aria-label={title}>
                        <h2 className="mb-3 text-[13px] font-semibold text-nv-ivory-100">{title}</h2>
                        <ul className="m-0 list-none p-0">
                            {links.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className={linkClass}>
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                            {title === "Company" && (
                                <li>
                                    <button type="button" onClick={() => setIsOpen(true)} className={linkClass}>
                                        Contact
                                    </button>
                                </li>
                            )}
                        </ul>
                    </nav>
                ))}
                <nav aria-label="Elsewhere">
                    <h2 className="mb-3 text-[13px] font-semibold text-nv-ivory-100">Elsewhere</h2>
                    <ul className="m-0 list-none p-0">
                        {footerLinks.media.map((link) => (
                            <li key={link.name}>
                                <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                    {link.name}
                                    <span className="sr-only"> (opens in a new tab)</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <div className="border-t border-nv-graphite-700">
                <p className="mx-auto max-w-[var(--nv-page-max)] px-[var(--nv-gutter)] py-4 text-nv-micro text-nv-ivory-300">
                    © {new Date().getFullYear()} Novaris. Open source, built by Ankit Singh.
                </p>
            </div>

            <Dialog
                open={isOpen}
                onClose={() => {
                    setIsOpen(false);
                    setCopyState("idle");
                }}
                title="Contact"
                description="Report a bug, request a feature, or ask a question by email."
                footer={
                    <>
                        <a href={`mailto:${CONTACT_EMAIL}`} className={buttonClasses("primary")}>
                            <Mail aria-hidden className="size-4" />
                            Send email
                        </a>
                        <Button onClick={() => setIsOpen(false)}>Close</Button>
                    </>
                }
            >
                <div className="flex items-center gap-2 rounded-nv-sm border border-nv-graphite-600 bg-nv-graphite-850 p-2 pl-3">
                    <code className="min-w-0 flex-1 truncate font-mono text-nv-small text-nv-ivory-100">{CONTACT_EMAIL}</code>
                    <Button
                        variant="ghost"
                        onClick={handleCopy}
                        leading={copyState === "copied" ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
                    >
                        {copyState === "copied" ? "Copied" : "Copy"}
                    </Button>
                </div>
                {copyState === "failed" && (
                    <Notice tone="warning" title="Could not copy" className="mt-3">
                        Your browser blocked clipboard access. Select the address above and copy it manually.
                    </Notice>
                )}
            </Dialog>
        </footer>
    );
}
