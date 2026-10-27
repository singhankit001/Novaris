"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Github, LogOut, LayoutDashboard, User } from "lucide-react";
import Image from "next/image";
import { Menu } from "@/components/nv/menu";
import { Button } from "@/components/nv/button";
import { Skeleton } from "@/components/nv/skeleton";

export default function AuthButton() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <Skeleton className="h-11 w-24 rounded-nv-sm" />;
    }

    if (session) {
        const name = session.user?.name || "Account";
        return (
            <Menu
                label={`Account menu for ${name}`}
                trigger={
                    session.user?.image ? (
                        <Image src={session.user.image} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />
                    ) : (
                        <User aria-hidden className="size-5" />
                    )
                }
                items={[
                    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" />, href: "/dashboard" },
                    { id: "signout", label: "Sign out", icon: <LogOut className="size-4" />, onSelect: () => signOut({ callbackUrl: "/" }) },
                ]}
            />
        );
    }

    return (
        <Button className="border-transparent bg-transparent hover:bg-nv-copper-wash" variant="secondary" leading={<Github aria-hidden className="size-4" />} onClick={() => signIn("github")}>
            <span className="hidden sm:inline">Sign in</span>
            <span className="sm:hidden">Sign in</span>
        </Button>
    );
}
