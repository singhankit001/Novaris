import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "../route";

function signOut(callbackUrl: string) {
    return GET(new NextRequest(`https://novaris.in/api/internal/auth/force-signout?callbackUrl=${encodeURIComponent(callbackUrl)}`));
}

describe("force-signout redirect", () => {
    it("redirects to same-origin paths", async () => {
        const response = await signOut("/dashboard?tab=scans");
        expect(response.headers.get("location")).toBe("https://novaris.in/dashboard?tab=scans");
    });

    it.each(["//evil.example/phish", "/\\evil.example", "https://evil.example", "javascript:alert(1)"])(
        "refuses off-site target %s",
        async (target) => {
            const response = await signOut(target);
            expect(new URL(response.headers.get("location")!).origin).toBe("https://novaris.in");
        }
    );

    it("clears Auth.js cookies", async () => {
        const request = new NextRequest("https://novaris.in/api/internal/auth/force-signout", {
            headers: { cookie: "__Secure-authjs.session-token=abc; theme=dark" },
        });
        const response = await GET(request);
        const cleared = response.headers.getSetCookie().join("\n");
        expect(cleared).toContain("__Secure-authjs.session-token=;");
        expect(cleared).not.toContain("theme=");
    });
});
