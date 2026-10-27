"use client";

import { SessionProvider } from "next-auth/react";
import { ServiceWorkerRegistration } from "./ServiceWorkerRegistration";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchOnWindowFocus={false}>
            <ServiceWorkerRegistration />
            {children}
        </SessionProvider>
    );
}
