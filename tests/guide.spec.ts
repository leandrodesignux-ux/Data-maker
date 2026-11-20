import { test, expect } from "@playwright/test";

test("MB-01 spotlight follows the filter popover and restores the chip when closed", async ({ page }) => {
  await page.goto("/casos/MB-01");
  const ring = page.locator(".guide-ring");
  await expect(ring).toBeVisible();
  await expect(page.locator(".guide-bubble")).toContainText("Abre Traffic Type");
  await page.locator('[data-guide="mb-filter-traffic"]').click();
  await expect(page.locator(".guide-bubble")).toContainText("Elige Paid");
  await page.locator('[data-guide="mb-option-traffic-paid"]').click();
  await expect(page.locator(".guide-bubble")).toContainText("Campaign Name");
  await page.locator('[data-guide="mb-filter-campaign"]').click();
  await expect(page.locator(".guide-bubble")).toContainText("Escribe «bodega»");
  await page.keyboard.press("Escape");
  await expect(page.locator(".guide-bubble")).toBeHidden();
  await page.getByRole("button", { name: "Muéstrame dónde" }).first().click();
  await expect(page.locator(".guide-bubble")).toBeVisible();
  await page.locator('[data-guide="mb-filter-campaign"]').click();
  await page.locator('[data-guide="mb-pop-search"]').fill("bodega");
  await expect(page.locator(".guide-bubble")).toContainText("Selecciona Ruta Bodega Horizonte");
  await page.locator('[data-guide="mb-option-campaign-ruta-bodega-horizonte"]').click();
  await expect(page.locator(".guide-bubble")).toContainText("Evidencia");
});

test("guided mode can be turned off and requested without a score penalty", async ({ page }) => {
  await page.goto("/casos/GA-01");
  const dock = page.getByRole("complementary", { name: "Misión GA-01" });
  const score = await dock.locator(".case-dock-meta strong").textContent();
  await dock.getByRole("checkbox", { name: "Modo guiado" }).uncheck();
  await expect(page.locator(".guide-bubble")).toBeHidden();
  await page.reload();
  await expect(dock.getByRole("checkbox", { name: "Modo guiado" })).not.toBeChecked();
  await dock.getByRole("button", { name: "Muéstrame dónde" }).first().click();
  await expect(page.locator(".guide-bubble")).toBeVisible();
  await expect(dock.locator(".case-dock-meta strong")).toHaveText(score ?? "");
});

test("Clarity filter guide enters the drawer and advances to Apply", async ({ page }) => {
  await page.goto("/casos/CL-03");
  await expect(page.locator(".guide-bubble")).toContainText("Abre Filtros");
  await page.locator('[data-guide="cl-filters-button"]').click();
  await expect(page.locator(".guide-bubble")).toContainText("Explorador");
  await page.locator('[data-guide="cl-filter-browser"]').selectOption("Safari");
  await expect(page.locator(".guide-bubble")).toContainText("Aplica");
  await page.locator('[data-guide="cl-filters-apply"]').click();
  await expect(page.locator('[data-step-id="safari"]')).toHaveAttribute("data-complete", "true");
});
