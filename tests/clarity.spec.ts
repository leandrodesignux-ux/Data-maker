import { expect, test } from "@playwright/test";

test("CL-01 filters spot sessions and reveals failed clicks on the gallery", async ({ page }) => {
  await page.goto("/clarity/panel?case=CL-01");
  await page.locator(".cl-idea").first().waitFor({ timeout: 60000 });
  await expect(page.locator(".cl-filters")).toContainText("Dirección URL visitada: /spots/");
  await page.locator(".cl-idea").filter({ hasText: "Clics fallidos" }).getByRole("button", { name: "Ver mapa térmico" }).click();
  await expect(page).toHaveURL(/clickKind=dead/);
  await page.locator(".cl-list-item").first().waitFor({ timeout: 60000 });
  await expect(page.locator(".cl-heat-list")).toContainText("gallery");
  await page.locator(".cl-list-item").first().hover();
  await expect(page.locator(".cl-heat-marker.hovered").first()).toBeVisible();
});

test("CL-02 compares desktop and mobile scroll reach", async ({ page }) => {
  await page.goto("/clarity/mapas-termicos?case=CL-02");
  await page.locator(".cl-scroll-reach").waitFor({ timeout: 60000 });
  await expect(page.locator(".cl-scroll-reach")).toContainText("75 %");
  await page.getByRole("button", { name: "Comparar" }).click();
  await expect(page.locator(".cl-map-pane")).toHaveCount(2);
  await expect(page.locator(".cl-pane-label").first()).toContainText("PC");
  await expect(page.locator(".cl-pane-label").last()).toContainText("Móvil");
  await expect(page.locator(".cl-map-pane").last()).toContainText("Oficina flexible");
  const labels = await page.locator(".cl-pane-label").allTextContents();
  const reach = labels.map(label => Number(label.match(/75 %: ([\d,]+)/)?.[1].replace(",", ".") ?? 0));
  expect(reach[1] - reach[0]).toBeGreaterThan(4);
  await expect(page).toHaveURL(/compare=true/);
});

test("CL-03 connects Safari rage clicks to the search and JS errors", async ({ page }) => {
  await page.goto("/clarity/panel?case=CL-03");
  await page.locator(".cl-idea").first().waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Filtros" }).click();
  await page.getByLabel("Explorador").selectOption("Safari");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.locator(".cl-filters")).toContainText("Explorador: Safari");
  await expect(page.locator(".cl-data-card").filter({ hasText: "Errores de JavaScript" })).toBeVisible();
  await page.locator(".cl-idea").filter({ hasText: "Clics continuos" }).getByRole("button", { name: "Ver mapa térmico" }).click();
  await page.locator(".cl-list-item").first().waitFor({ timeout: 60000 });
  await expect(page.locator(".cl-heat-list")).toContainText("location-search");
  await expect(page).toHaveURL(/browser=Safari/);
  await expect(page.getByRole("button", { name: "Atención" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Grabaciones" }).first()).toBeDisabled();
});

test("heatmap exports a PNG and panel cards can be reordered", async ({ page }) => {
  await page.goto("/clarity/mapas-termicos");
  await page.locator(".cl-heat-overlay").waitFor({ timeout: 60000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar imagen" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  await page.goto("/clarity/panel");
  await page.locator(".cl-data-card").first().waitFor({ timeout: 60000 });
  const cards = page.locator(".cl-data-card");
  await cards.nth(1).dragTo(cards.first());
  await expect(cards.first()).toContainText("Ideas");
});
