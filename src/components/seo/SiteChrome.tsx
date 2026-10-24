import type { ReactNode } from "react";
import AuthButton from "@/components/AuthButton";
import Footer from "@/components/Footer";
import { cn } from "@/components/nv/cn";
import SiteHeader, { type HeaderLink } from "./SiteHeader";

const LINKS: Omit<HeaderLink, "current">[] = [
  { href: "/solutions", label: "Product" },
  { href: "/trending", label: "Explore" },
  { href: "/blog", label: "Insights" },
  { href: "/faq", label: "FAQ" },
];

interface SiteChromeProps {
  children: ReactNode;
  /** Path of the section the page belongs to, e.g. "/blog"; marks that nav link current. */
  current?: string;
  className?: string;
}

/** Public-site frame: header, a single <main id="nv-main"> landmark, footer. */
export default function SiteChrome({ children, current, className }: SiteChromeProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        links={LINKS.map((l) => ({ ...l, current: current === l.href }))}
        cta={{ href: "/", label: "Start analyzing" }}
        account={<AuthButton />}
      />
      <main id="nv-main" tabIndex={-1} className={cn("min-w-0 flex-1 overflow-x-clip outline-none", className)}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
