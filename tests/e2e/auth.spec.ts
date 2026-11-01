import { expect, test } from "@playwright/test";

// Exercises the real NextAuth handshake up to GitHub's authorize page. Completing the GitHub
// login itself needs a real account and is not automated here.

// Phones keep the account button inside the header menu.
async function clickSignIn(page: import("@playwright/test").Page) {
    const menu = page.getByRole("button", { name: "Open menu" });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole("button", { name: /^sign in$/i }).filter({ visible: true }).first().click();
}

// GitHub is registered only when AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are both set.
async function githubConfigured(request: import("@playwright/test").APIRequestContext) {
    const res = await request.get("/api/auth/providers");
    expect(res.status()).toBe(200);
    const body = await res.json();
    return body?.github?.id === "github";
}

test("unconfigured GitHub sign-in shows the configuration notice instead of a broken GitHub page", async ({ page, request }) => {
    test.skip(await githubConfigured(request), "GitHub OAuth app is configured");
    await page.goto("/");
    await clickSignIn(page);
    await expect(page).toHaveURL(/\?error=Configuration/);
    await expect(page.getByRole("main").getByText("GitHub sign-in is not available right now")).toBeVisible();
});

test("sign-in button sends the browser to GitHub with this site's callback", async ({ page, baseURL, request }) => {
    test.skip(!(await githubConfigured(request)), "AUTH_GITHUB_ID / AUTH_GITHUB_SECRET not set");
    await page.goto("/");
    const authorize = page.waitForRequest((req) => req.url().startsWith("https://github.com/login/oauth/authorize"));
    await clickSignIn(page);
    const url = new URL((await authorize).url());
    expect(url.searchParams.get("client_id")).toBeTruthy();
    expect(url.searchParams.get("redirect_uri")).toBe(`${baseURL}/api/auth/callback/github`);
    expect(url.searchParams.get("scope")).toContain("read:user");
});

test("signed-out dashboard visit redirects to the homepage sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/\?callbackUrl=|\/$/);
});

test("session endpoint returns no user when signed out", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    expect(res.status()).toBe(200);
    expect(await res.json()).toBeNull();
});
