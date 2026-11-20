import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { caseById } from "../src/cases/registry";

const routes = [
  ["hub", "/"],
  ["cases", "/casos"],
  ["metabase", "/metabase/dashboard/growth-full-picture"],
  ["ga4", "/ga4/informes/eventos"],
  ["ga4-trafico", "/ga4/informes/adquisicion-trafico"],
  ["ga4-detalle", "/ga4/informes/eventos/clientRequestedWhatsappForm"],
  ["ga4-embudo", "/ga4/explorar/embudo"],
  ["clarity", "/clarity/panel"],
  ["clarity-mapas", "/clarity/mapas-termicos"],
  ["clarity-scroll", "/clarity/mapas-termicos?mode=scroll&device=desktop&sector=Oficinas&url=%2Fspots%2F"],
  ["clarity-compare", "/clarity/mapas-termicos?mode=scroll&device=desktop&sector=Oficinas&url=%2Fspots%2F&compare=true&compareDevice=mobile"],
  ["case-mb", caseById["MB-01"].startRoute],
  ["case-ga", caseById["GA-01"].startRoute],
  ["case-cl", caseById["CL-01"].startRoute],
] as const;

for (const [name, route] of routes) {
  test(`capture ${name}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBeTruthy();
    await page.locator("body").waitFor();
    if (name === "metabase" || name === "case-mb") {
      await page.locator(".mb-kpi-value").first().waitFor({ timeout: 30000 });
      await page.locator(".mb-chart-body canvas").first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(700);
    }
    if (name.startsWith("ga4") || name === "case-ga") {
      if (name === "ga4-embudo" || name === "case-ga") await page.locator(".ga-funnel-table tbody tr").first().waitFor({ timeout: 60000 });
      else await page.locator(name === "ga4-detalle" ? ".ga-detail-kpis strong" : ".ga-data-table tbody tr").first().waitFor({ timeout: 60000 });
      await page.locator("canvas").first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(500);
    }
    if (name.startsWith("clarity") || name === "case-cl") {
      await page.locator(name === "clarity" || name === "case-cl" ? ".cl-data-card" : ".cl-heat-overlay").first().waitFor({ timeout: 60000 });
      if (name !== "clarity" && name !== "case-cl") await page.waitForTimeout(850);
    }
    if (name.startsWith("case-")) await page.locator(".case-dock").waitFor();
    await mkdir(join(process.cwd(), "tests", "__shots__"), { recursive: true });
    if (name === "metabase") await page.screenshot({ path: join(process.cwd(), "tests", "__shots__", "metabase-top.png") });
    if (name.startsWith("ga4") || name.startsWith("case-")) await page.screenshot({ path: join(process.cwd(), "tests", "__shots__", `${name}-top.png`) });
    if (name.startsWith("clarity")) await page.screenshot({ path: join(process.cwd(), "tests", "__shots__", `${name}-top.png`) });
    await page.screenshot({ path: join(process.cwd(), "tests", "__shots__", `${name}.png`), fullPage: true });
    if (name === "metabase") { await page.getByRole("heading", { name: "Pipeline", exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: join(process.cwd(), "tests", "__shots__", "metabase-pipeline.png") }); }
  });
}
