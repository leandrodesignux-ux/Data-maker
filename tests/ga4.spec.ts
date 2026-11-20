import { expect, test } from "@playwright/test";
import { caseById } from "../src/cases/registry";

test("GA-01 can be diagnosed through the funnel device breakdown", async ({ page }) => {
  await page.goto("/ga4/explorar/embudo?case=GA-01");
  await page.locator(".ga-funnel-table tbody tr").first().waitFor({ timeout: 60000 });
  await expect(page.locator(".ga-funnel-table")).not.toContainText("desktop");
  await page.getByLabel("Desglose del embudo").selectOption("device");
  await expect(page.locator(".ga-funnel-table")).toContainText("desktop");
  await expect(page.locator(".ga-funnel-table")).toContainText("mobile");
  await page.getByText("Editar los pasos", { exact: true }).click();
  await expect(page.getByText("Editar los pasos del embudo de conversión")).toBeVisible();
  await page.getByLabel("Evento del paso 4").selectOption("clientClickedContactLead");
  await page.getByRole("button", { name: "Aplicar" }).last().click();
  await expect(page.locator(".ga-step-list")).toContainText("4. Abre contacto");
});

test("GA-02 traffic report compares periods and changes campaign dimension", async ({ page }) => {
  await page.goto(caseById["GA-02"].startRoute);
  await page.locator(".ga-data-table tbody tr").first().waitFor({ timeout: 60000 });
  await expect(page.locator(".ga-data-table")).toContainText("vs anterior");
  await page.locator(".ga-primary-dimension select").selectOption("campaign");
  await expect(page.locator(".ga-data-table")).toContainText("Vitrina Urbana 360");
  await expect(page).toHaveURL(/dimension=campaign/);
});

test("GA-03 event detail preserves filter state", async ({ page }) => {
  await page.goto("/ga4/informes/eventos?case=GA-03");
  await page.locator(".ga-data-table tbody tr").first().waitFor({ timeout: 60000 });
  await expect(page.locator(".ga-table-search input")).toHaveValue("clientRequestedWhatsappForm");
  await page.locator(".ga-row-label a").first().click();
  await expect(page.getByRole("heading", { name: "clientRequestedWhatsappForm" })).toBeVisible();
  await expect(page).toHaveURL(/case=GA-03/);
  await page.locator(".ga-parameter-controls select").selectOption("browser");
  await expect(page.locator(".ga-detail-parameters")).toContainText("Safari");
});
