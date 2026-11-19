import { test, expect } from "@playwright/test";

test("generates and caches the shared universe in a browser worker", async ({ page }) => {
  await page.goto("/ga4/informes/eventos");
  await expect.poll(() => page.locator("html").getAttribute("data-simulator-sessions"), { timeout: 30000 }).toMatch(/^\d+$/);
  const count = Number(await page.locator("html").getAttribute("data-simulator-sessions"));
  expect(count).toBeGreaterThan(40_000);
  expect(count).toBeLessThan(60_000);
  await page.goto("/clarity/panel");
  await expect(page.locator("html")).toHaveAttribute("data-simulator-sessions", String(count));
});
