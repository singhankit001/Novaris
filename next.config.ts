import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the root: a stray lockfile in a parent directory otherwise becomes the inferred workspace root.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  // Stop `next dev` from writing a managed AGENTS.md into the repository.
  agentRules: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      {
        // The browser must revalidate the worker script so updates roll out on the next visit.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/code-analyzer",
        destination: "/ai-code-review-tool",
        permanent: true,
      },
      {
        source: "/repo-analyzer",
        destination: "/github-repository-analysis",
        permanent: true,
      },
      {
        source: "/architecture-analyzer",
        destination: "/github-repository-analysis",
        permanent: true,
      },
    ];
  },
  images: {
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'img.shields.io',
      },
      {
        protocol: 'https',
        hostname: 'public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
};

export default nextConfig;
