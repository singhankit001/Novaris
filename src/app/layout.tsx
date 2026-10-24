import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import JsonLd from "./components/json-ld";
import { Providers } from "@/components/Providers";
import { getCanonicalSiteUrl } from "@/lib/site-url";
import CommandPalette from "@/components/CommandPalette";

// Novaris type system (DESIGN.md). All three families are SIL Open Font License 1.1.
const nvSans = Geist({ subsets: ["latin"], variable: "--nv-font-sans-face", display: "swap" });
const nvMono = Geist_Mono({ subsets: ["latin"], variable: "--nv-font-mono-face", display: "swap" });
const nvSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--nv-font-serif-face", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#fafaf7",
  width: "device-width",
  initialScale: 1,
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
    statusBarStyle: "default",
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
    <html lang="en" className={`${nvSans.variable} ${nvMono.variable} ${nvSerif.variable}`} suppressHydrationWarning>
      <body
        data-nv-root
        className="antialiased font-nv-sans bg-nv-graphite-950 text-nv-ivory-100"
        suppressHydrationWarning
      >
        <JsonLd />
        <Providers>
          <CommandPalette />
          {children}
        </Providers>
        <Toaster
          position="top-right"
          theme="light"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'var(--nv-surface)',
              border: '1px solid var(--nv-hairline)',
              boxShadow: 'var(--nv-shadow-popover)',
              borderRadius: 'var(--nv-radius-md)',
              color: 'var(--nv-text)',
            },
          }}
        />
      </body>
    </html>
  );
}
