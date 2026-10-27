import { test, expect } from '@playwright/test';
test('discovery search, categories, collections, sorting and responsive layout', async ({ page }) => {
  await page.route('**/api/ecosystem', route => route.fulfill({ json: { metrics: { 'openai/codex': { stars: 1234, forks: 50, pushedAt: '2026-10-20T00:00:00Z', fetchedAt: '2026-10-27T00:00:00Z', archived: false } } } }));
  await page.goto('/explore');
  await expect(page.getByRole('heading', { name: 'Your next unfair advantage.' })).toBeVisible();
  await page.getByRole('button', { name: 'MCP servers', exact: true }).click();
  await expect(page.locator('section[aria-labelledby="ecosystem-title"]').getByRole('article')).toHaveCount(4);
  await page.getByRole('searchbox', { name: 'Search ecosystem' }).fill('playwright');
  await expect(page.locator('section[aria-labelledby="ecosystem-title"]').getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Playwright MCP', exact: true })).toHaveAttribute('href', 'https://github.com/microsoft/playwright-mcp');
  await page.getByRole('searchbox', { name: 'Search ecosystem' }).fill('does-not-exist');
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page.locator('section[aria-labelledby="ecosystem-title"]').getByRole('article')).toHaveCount(23);
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('stars');
  await expect(page.locator('section[aria-labelledby="ecosystem-title"]').getByRole('article').first()).toContainText('Codex');
  await page.getByRole('button', { name: /FROM IDEA TO PRODUCTION/ }).click();
  await expect(page.locator('section[aria-labelledby="ecosystem-title"]').getByRole('article')).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('section[aria-labelledby="ecosystem-title"]').getByRole('article').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/ecosystem-${test.info().project.name}.png`, fullPage: false });
});
test('trending retains the repository catalog', async ({ page }) => {
  await page.route('**/api/ecosystem', route => route.fulfill({ json: { metrics: {} } }));
  await page.goto('/trending');
  await expect(page.getByRole('heading', { name: 'Trending GitHub repositories' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Repository order' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Time window' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
