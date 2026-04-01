import { describe, expect, it, vi } from "vitest";

vi.mock("./HomeClient", () => ({
    default: () => null,
}));

import { metadata } from "./page";

describe("home page metadata", () => {
    it("uses intent-led metadata for repository analysis workflows", () => {
        expect(metadata.title).toBe("GitHub Repository Analysis, Code Review & Security Scanning");
        expect(metadata.description).toContain("Analyze GitHub repositories and developer profiles with Agentic AI");
        expect(metadata.openGraph?.title).toBe("GitHub Repository Analysis, Code Review & Security Scanning | Novaris");
        expect(metadata.twitter?.title).toBe("GitHub Repository Analysis, Code Review & Security Scanning | Novaris");
        const ogImages = metadata.openGraph?.images as { url?: string; width?: number; height?: number }[] | undefined;
        const twitterImages = metadata.twitter?.images as string[] | undefined;
        expect(ogImages?.[0]?.url).toBe("/og/homepage.png");
        expect(ogImages?.[0]?.width).toBe(1200);
        expect(ogImages?.[0]?.height).toBe(630);
        expect(twitterImages?.[0]).toBe("/og/homepage.png");
        expect(metadata.twitter?.creator).toBe("@_sam2903");
        expect(metadata.twitter?.site).toBe("@_sam2903");
    });
});
