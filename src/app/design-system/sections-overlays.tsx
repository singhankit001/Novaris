"use client";

import { useState } from "react";
import { Button } from "@/components/nv/button";
import { Dialog, Drawer } from "@/components/nv/dialog";
import { Breadcrumbs, Footer, MobileNav, SideNav, Wordmark, type NavLink } from "@/components/nv/nav";
import { Eye, FolderGit2, LayoutDashboard, ScanSearch, Star } from "lucide-react";
import { Section, Specimen } from "./section";

const nav: NavLink[] = [
  { href: "#", label: "Overview", icon: <LayoutDashboard className="size-4" />, current: true },
  { href: "#", label: "Scans", icon: <ScanSearch className="size-4" /> },
  { href: "#", label: "Repos", icon: <FolderGit2 className="size-4" /> },
  { href: "#", label: "Starred", icon: <Star className="size-4" /> },
  { href: "#", label: "Watching", icon: <Eye className="size-4" /> },
];

export function OverlaySections() {
  const [dlg, setDlg] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [side, setSide] = useState(false);
  return (
    <>
      <Section id="dialogs" title="Dialog, sheet and drawer" lede="Native <dialog>: focus trap, inert background, Esc, backdrop click, and focus returns to the opener. The same component is a bottom sheet on mobile and a right drawer for filters.">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setDlg(true)}>Open dialog</Button>
          <Button onClick={() => setSheet(true)}>Open bottom sheet</Button>
          <Button onClick={() => setSide(true)}>Open right drawer</Button>
        </div>
        <Dialog destructive open={dlg} onClose={() => setDlg(false)} title="Delete this report?" description="Share links to it stop working immediately."
          footer={<><Button onClick={() => setDlg(false)}>Cancel</Button><Button variant="danger" onClick={() => setDlg(false)}>Delete report</Button></>}>
          <p className="text-nv-ivory-200">Scan data stays in your history. Only the shareable report is removed.</p>
        </Dialog>
        <Drawer open={sheet} side="bottom" onClose={() => setSheet(false)} title="Filters"><p className="text-nv-ivory-200">Severity, basis, repository.</p></Drawer>
        <Drawer open={side} onClose={() => setSide(false)} title="File tree"><p className="text-nv-ivory-200">Tree opens here on tablet and mobile.</p></Drawer>
      </Section>

      <Section id="navigation" title="Navigation" lede="Desktop: left rail from 1024. Below that, a bottom tab bar (max five). Marketing pages use SiteHeader with a drawer under 768.">
        <Specimen label="Breadcrumbs"><Breadcrumbs items={[{ label: "Repos", href: "#" }, { label: "vercel", href: "#" }, { label: "next.js" }]} /></Specimen>
        <Specimen label="SideNav (visible lg+) / MobileNav (below lg), wordmark">
          <div className="flex flex-col gap-4">
            <Wordmark />
            <div className="hidden min-h-64 overflow-hidden rounded-nv-md border border-nv-graphite-700 lg:flex"><SideNav links={nav} label="Dashboard" /></div>
            <div className="relative h-20 overflow-hidden rounded-nv-md border border-nv-graphite-700 lg:hidden">
              <div className="absolute inset-x-0 bottom-0 [&>nav]:static"><MobileNav links={nav} label="Dashboard mobile" /></div>
            </div>
          </div>
        </Specimen>
        <Footer groups={[
          { title: "Product", links: [{ href: "/solutions", label: "Solutions" }, { href: "/compare", label: "Compare" }] },
          { title: "Learn", links: [{ href: "/blog", label: "Blog" }, { href: "/faq", label: "FAQ" }] },
          { title: "Legal", links: [{ href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }] },
        ]} />
      </Section>
    </>
  );
}
