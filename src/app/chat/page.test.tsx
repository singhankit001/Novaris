import { describe, expect, it, vi } from "vitest";

vi.mock("./ChatPageClient", () => ({
    default: () => null,
}));

import { metadata } from "./page";

describe("chat metadata", () => {
    it("uses a generic, noindex chat preview card", () => {
        expect(metadata.title).toBe("Chat");
        expect(metadata.description).toContain("Paste a GitHub repository or developer profile");
        const robots = metadata.robots as { index?: boolean; follow?: boolean } | undefined;
        const ogImages = metadata.openGraph?.images as { url?: string }[] | undefined;
        const twitterImages = metadata.twitter?.images as string[] | undefined;
        expect(robots?.index).toBe(false);
        expect(robots?.follow).toBe(true);
        expect(ogImages?.[0]?.url).toBe("/og/homepage.png");
        expect(twitterImages?.[0]).toBe("/og/homepage.png");
    });
});
