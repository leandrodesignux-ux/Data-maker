import { test, expect } from "@playwright/test";

test("Metabase filters, tabs and chart actions work with synthetic data", async ({ page }) => {
  await page.goto("/metabase/dashboard/growth-full-picture");
  const leads = page.locator(".mb-kpi-value").first();
  await expect(leads).toBeVisible({ timeout: 30000 });
  const initialLeads = await leads.textContent();
  await page.getByRole("button", { name: "Actions for Leads", exact: true }).click();
  await page.getByRole("menuitem", { name: "Fullscreen" }).click();
  await expect(page.getByRole("dialog")).toContainText(initialLeads ?? "");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: /Entry Point: Browse Page/ }).click();
  await page.getByRole("checkbox", { name: "Browse Page", exact: true }).click();
  await page.getByRole("checkbox", { name: "Home", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/entryPoint=Home/);
  await expect(leads).not.toHaveText(initialLeads ?? "");
  await page.getByRole("button", { name: /Time grouping: Week/ }).click();
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await expect(page).toHaveURL(/grouping=Day/);
  await page.getByRole("button", { name: "Supply", exact: true }).click();
  await expect(page).toHaveURL(/tab=supply/);
  await expect(page.locator(".mb-kpi-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Actions for Projects by Priority" }).click();
  await page.getByRole("menuitem", { name: "View as table" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("tbody tr").first()).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).or(page.locator(".mb-modal-close")).first().click();
  await page.getByRole("button", { name: "Actions for Projects by Priority" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Download CSV" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/projects-by-priority\.csv/);
});

for (const id of ["MB-01", "MB-02", "MB-03"]) {
  test(`${id} opens a symptom view`, async ({ page }) => {
    await page.goto(`/metabase/dashboard/growth-full-picture?case=${id}`);
    await expect(page.locator(".mb-kpi-value").first()).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/datePreset=custom/);
  });
}
