import { expect, test } from "@playwright/test";

test.describe("service worker", () => {
    test.skip(({ browserName }) => browserName !== "chromium", "service worker checks run in Chromium");

    test("registers, stores only the offline page, and serves it when the network is down", async ({ page, context }) => {
        await page.goto("/");
        const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
        expect(new URL(scope).pathname).toBe("/");

        // Exercise private and API responses while the worker controls the page.
        await page.reload();
        await page.evaluate(async () => {
            await fetch("/api/auth/session");
            await fetch("/api/chat/quota");
        });

        const cached = await page.evaluate(async () => {
            const result: Record<string, string[]> = {};
            for (const name of await caches.keys()) {
                const cache = await caches.open(name);
                result[name] = (await cache.keys()).map((request) => new URL(request.url).pathname);
            }
            return result;
        });
        expect(cached).toEqual({ "novaris-offline-v1": ["/_offline.html"] });

        await context.setOffline(true);
        await page.goto("/trending").catch(() => undefined);
        await expect(page.getByRole("heading", { name: /You're Offline/i })).toBeVisible();
        await context.setOffline(false);
    });

    test("worker script is served without HTTP caching so updates are picked up", async ({ request }) => {
        const response = await request.get("/sw.js");
        expect(response.ok()).toBe(true);
        expect(response.headers()["cache-control"]).toContain("no-cache");
    });
});
