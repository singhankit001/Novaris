"use client";

import { BarChart2, ExternalLink, FileText, LayoutDashboard, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import AppHeader from "@/components/Dashboard/AppHeader";
import { AppShell, MobileNav, SideNav, type NavLink } from "@/components/nv/nav";

const items = [
  { icon: <LayoutDashboard className="size-4" />, label: "Home", href: "/admin" },
  { icon: <BarChart2 className="size-4" />, label: "Analytics", href: "/admin/stats" },
  { icon: <FileText className="size-4" />, label: "Blog", href: "/admin/blog" },
  { icon: <Search className="size-4" />, label: "Index", href: "/admin/index" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const links: NavLink[] = items.map((item) => ({
    ...item,
    current: item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
  }));

  return (
    <AppShell
      header={<AppHeader area="Admin" />}
      sideNav={
        <SideNav
          links={links}
          label="Admin"
          footer={
            <a
              href="/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2.5 rounded-nv-sm px-3 text-nv-small text-nv-ivory-300 hover:bg-nv-graphite-850 hover:text-nv-ivory-50"
            >
              <ExternalLink aria-hidden className="size-4" />
              View public blog
            </a>
          }
        />
      }
      mobileNav={<MobileNav links={links} label="Admin" />}
    >
      <div className="mx-auto w-full max-w-[var(--nv-page-max)] px-[var(--nv-gutter)] py-8">{children}</div>
    </AppShell>
  );
}
