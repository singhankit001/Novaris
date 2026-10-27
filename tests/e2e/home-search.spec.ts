import { expect, test } from "@playwright/test";

const searchInput = (page: import("@playwright/test").Page) =>
    page.getByRole("textbox", { name: "GitHub URL, username, or repository" });

test("suggestion spinner clears when the query is shortened mid-request", async ({ page }) => {
    let releaseSuggestions: () => void = () => {};
    const held = new Promise<void>((resolve) => {
        releaseSuggestions = resolve;
    });

    // Server actions POST to the page URL with a Next-Action header; hold them open.
    await page.route("**/*", async (route) => {
        const request = route.request();
        if (request.method() === "POST" && request.headers()["next-action"]) {
            await held;
        }
        await route.fallback();
    });

    await page.goto("/");
    const input = searchInput(page);
    await input.fill("rea");

    const submit = page.getByRole("button", { name: "Analyze", exact: true });
    await expect(submit.locator(".animate-spin")).toBeVisible();

    await input.fill("re");
    await expect(submit.locator(".animate-spin")).toHaveCount(0);

    releaseSuggestions();
    await expect(submit.locator(".animate-spin")).toHaveCount(0);
});

test("search submit button shows a visible keyboard focus indicator", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "focus-visible heuristics differ by engine");
    await page.goto("/");
    const input = searchInput(page);
    await input.fill("a");
    await input.press("Tab");

    const submit = page.getByRole("button", { name: "Analyze", exact: true });
    await expect(submit).toBeFocused();
    const outline = await submit.evaluate((el) => {
        const style = getComputedStyle(el);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThanOrEqual(2);
});
