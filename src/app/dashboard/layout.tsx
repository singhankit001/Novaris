"use client";

import { BookOpen, History, LayoutDashboard, Settings, Star } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import AppHeader from "@/components/Dashboard/AppHeader";
import { AppShell, MobileNav, SideNav, type NavLink } from "@/components/nv/nav";
import { LoadingRegion } from "@/components/nv/skeleton";
import { ErrorState } from "@/components/nv/states";

const items = [
    { icon: <LayoutDashboard className="size-4" />, label: "Overview", href: "/dashboard" },
    { icon: <History className="size-4" />, label: "Scans", href: "/dashboard/scans" },
    { icon: <BookOpen className="size-4" />, label: "Repos", href: "/dashboard/repos" },
    { icon: <Star className="size-4" />, label: "Starred", href: "/dashboard/starred" },
    { icon: <Settings className="size-4" />, label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
    const hasInvalidSession = status !== "loading" && Boolean(session?.user) && !sessionUserId;

    useEffect(() => {
        if (hasInvalidSession) {
            signOut({ callbackUrl: "/?error=invalid_session" });
        }
    }, [hasInvalidSession]);

    if (hasInvalidSession) {
        return (
            <div className="min-h-dvh">
                <LoadingRegion label="Signing you out of an invalid session">
                    <ErrorState title="Your session is not valid" detail="INVALID_SESSION">
                        <p>You are being signed out. Sign in again to continue.</p>
                    </ErrorState>
                </LoadingRegion>
            </div>
        );
    }

    const links: NavLink[] = items.map((item) => ({ ...item, current: pathname === item.href }));

    return (
        <AppShell
            header={<AppHeader />}
            sideNav={<SideNav links={links} label="Dashboard" />}
            mobileNav={<MobileNav links={links} label="Dashboard" />}
        >
            <div className="mx-auto w-full max-w-[var(--nv-page-max)] px-[var(--nv-gutter)] py-6 sm:py-10">{children}</div>
        </AppShell>
    );
}
