import { expect, test } from "@playwright/test";

// Real GitHub + Gemini round trip. Costs API quota, so it runs only with LIVE_E2E=1.
test.skip(!process.env.LIVE_E2E, "set LIVE_E2E=1 to call real GitHub and Gemini");
test.setTimeout(180_000);

const REPO = "sindresorhus/slugify";

test("public repo loads and a question returns an answer that cites a real file", async ({ page }) => {
    const chatErrors: string[] = [];
    page.on("response", (res) => {
        // /api/chat/run answers 503 without DATABASE_URL by design (no resume); only the answer stream must succeed.
        if (res.url().includes("/api/chat/repo") && res.status() >= 400) chatErrors.push(`${res.status()} ${res.url()}`);
    });

    await page.goto(`/chat?q=${REPO}`);
    await expect(page.getByRole("heading", { name: "slugify", level: 1 })).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Open chat" }).filter({ visible: true }).first().click();
    const input = page.getByRole("combobox", { name: "Your question" });
    await expect(input).toBeEnabled({ timeout: 30_000 });

    await input.fill("What does the default export do? Cite the file and lines.");
    await page.getByRole("button", { name: "Send question" }).click();

    // index.js is the package entry; a grounded answer cites it with a line range and lists it as a source.
    const answer = page.getByRole("article", { name: "Answer" });
    await expect(answer.getByRole("button", { name: /index\.js L\d+/ }).first()).toBeVisible({ timeout: 150_000 });
    await expect(answer.getByRole("region", { name: "What this answer is based on" })).toContainText("index.js");
    expect(chatErrors).toEqual([]);
});
