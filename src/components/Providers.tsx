"use client";

import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";

const Global3DParallaxBackground = dynamic(
    () => import("./Global3DParallaxBackground"),
    { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchOnWindowFocus={false}>
            <Global3DParallaxBackground />
            {children}
        </SessionProvider>
    );
}
