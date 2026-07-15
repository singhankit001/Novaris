import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import JsonLd from "./components/json-ld";
import { Providers } from "@/components/Providers";
import { getCanonicalSiteUrl } from "@/lib/site-url";
import CommandPalette from "@/components/CommandPalette";
import { CursorGlow } from "@/components/CursorGlow";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const canonicalSiteUrl = getCanonicalSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(canonicalSiteUrl),
  applicationName: "Novaris",
  title: {
    default: "Novaris",
    template: "%s | Novaris",
  },
  description: "Analyze GitHub repositories with full-context AI for architecture understanding, code review, and security scanning.",
  authors: [{ name: "Ankit Singh", url: "https://github.com/singhankit001" }],
  keywords: [
    "github repository analysis",
    "github code analyzer",
    "ai code review tool",
    "repository security scanner",
    "repository risk analysis",
    "architecture analysis",
    "code intelligence",
    "developer tools",
  ],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/no-bg-novaris.png', sizes: '500x500', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: "Novaris",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Novaris",
    description: "Analyze GitHub repositories with full-context AI for architecture understanding, code review, and security scanning.",
    url: canonicalSiteUrl,
    siteName: "Novaris",
    images: [
      {
        url: "/og/homepage.png",
        width: 1200,
        height: 630,
        alt: "Novaris landing page preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Novaris",
    description: "Analyze GitHub repositories with full-context AI for architecture understanding, code review, and security scanning.",
    images: ["/og/homepage.png"],
    creator: "@_sam2903",
    site: "@_sam2903",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "UkRCYeGXDptF64Z3y2sS0d2AUkCSuirzjRZQJUz1iEQ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body
        className="antialiased font-sans"
        suppressHydrationWarning
      >
        <JsonLd />
        <Providers>
          <CursorGlow />
          <CommandPalette />
          {children}
        </Providers>
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
