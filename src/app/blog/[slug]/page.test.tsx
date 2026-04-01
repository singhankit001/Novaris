import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    getPublishedPostBySlugMock,
    getPublishedPostsMock,
} = vi.hoisted(() => ({
    getPublishedPostBySlugMock: vi.fn(),
    getPublishedPostsMock: vi.fn(),
}));

vi.mock("@/lib/services/blog-service", () => ({
    getPublishedPostBySlug: getPublishedPostBySlugMock,
    getPublishedPosts: getPublishedPostsMock,
}));

vi.mock("@/components/Footer", () => ({
    default: () => null,
}));

vi.mock("@/components/EnhancedMarkdown", () => ({
    EnhancedMarkdown: () => null,
}));

vi.mock("next/image", () => ({
    default: () => null,
}));

import { generateMetadata } from "./page";

describe("blog post metadata", () => {
    beforeEach(() => {
        getPublishedPostBySlugMock.mockReset();
        getPublishedPostsMock.mockReset();
    });

    it("builds article metadata for published posts", async () => {
        const post = {
            slug: "deep-dive",
            title: "Deep Dive into Novaris",
            excerpt: "How we build high-context repository analysis for the web.",
            keywords: "security, analysis",
            category: "Engineering",
            image: "https://cdn.example.com/blog/deep-dive.png",
            author: "Novaris",
            createdAt: new Date("2026-03-10T00:00:00.000Z"),
            updatedAt: new Date("2026-03-12T00:00:00.000Z"),
            publishedAt: new Date("2026-03-11T00:00:00.000Z"),
        };

        getPublishedPostBySlugMock.mockResolvedValue(post);

        const metadata = await generateMetadata({
            params: Promise.resolve({ slug: "deep-dive" }),
        });

        const og = metadata.openGraph as { type?: string; publishedTime?: string; modifiedTime?: string; images?: { url: string }[] } | undefined;
        const twitterImages = metadata.twitter?.images as string[] | undefined;
        expect(metadata.title).toBe(post.title);
        expect(metadata.description).toBe(post.excerpt);
        expect(og?.type).toBe("article");
        expect(og?.publishedTime).toBe(post.publishedAt.toISOString());
        expect(og?.modifiedTime).toBe(post.updatedAt.toISOString());
        expect(og?.images?.[0]?.url).toBe("/og/blogs.png");
        expect(twitterImages?.[0]).toBe(post.image);
    });

    it("returns noindex metadata for missing posts", async () => {
        getPublishedPostBySlugMock.mockResolvedValue(null);

        const metadata = await generateMetadata({
            params: Promise.resolve({ slug: "missing" }),
        });

        expect(metadata.title).toBe("Post Not Found");
        const robots = metadata.robots as { index?: boolean } | undefined;
        const og = metadata.openGraph as { images?: { url: string }[] } | undefined;
        expect(robots?.index).toBe(false);
        expect(og?.images?.[0]?.url).toBe("/og/homepage.png");
    });
});
