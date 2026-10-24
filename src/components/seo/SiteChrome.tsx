import type { ReactNode } from "react";
import { SiteHeader, type NavLink } from "@/components/nv/nav";
import AuthButton from "@/components/AuthButton";
import Footer from "@/components/Footer";
import { cn } from "@/components/nv/cn";

const LINKS: Omit<NavLink, "current">[] = [
  { href: "/solutions", label: "Product" },
  { href: "/trending", label: "Explore" },
  { href: "/blog", label: "Insights" },
  { href: "/faq", label: "FAQ" },
];

interface SiteChromeProps {
  children: ReactNode;
  /** Path of the section the page belongs to, e.g. "/blog"; marks that nav link current. */
  current?: string;
  /** Set false when the page needs the full width (landing). */
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
      <main id="nv-main" tabIndex={-1} className={cn("min-w-0 flex-1 outline-none", className)}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
