import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

test("MB-01 multiselect options stay readable inside the dark app portal", async ({ page }) => {
  await page.goto("/casos/MB-01");
  await page.locator(".mb-kpi-value").first().waitFor({ timeout: 60000 });
  const output = join(process.cwd(), "tests", "__shots__");
  await mkdir(output, { recursive: true });
  for (const [name, label] of [["campaign", "Campaign Name"], ["sector", "Sector"], ["agent", "Agent Source"]] as const) {
    await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
    const popover = page.locator(".mb-popover");
    await expect(popover).toBeVisible();
    const rows = popover.locator(".mb-pop-options > label");
    await expect(rows.first()).toBeVisible();
    expect(await rows.first().innerText()).not.toBe("");
    const state = await popover.evaluate(node => ({
      inApp: !!node.closest('[data-app="metabase"]'),
      blue: getComputedStyle(node).getPropertyValue("--mb-blue").trim(),
      scheme: getComputedStyle(node).colorScheme,
      overflow: node.querySelector(".mb-pop-options")!.scrollWidth - node.querySelector(".mb-pop-options")!.clientWidth,
      checkboxWidth: node.querySelector(".mb-checkbox")!.getBoundingClientRect().width,
    }));
    expect(state.inApp).toBe(true);
    expect(state.blue).not.toBe("");
    expect(state.scheme).toBe("dark");
    expect(state.overflow).toBeLessThanOrEqual(1);
    expect(state.checkboxWidth).toBe(15);
    await page.screenshot({ path: join(output, `mb01-${name}-options.png`) });
    await page.keyboard.press("Escape");
  }
});

test("mission dock yields to overlapping popovers and restores its content", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/casos/MB-01");
  const dock = page.getByRole("complementary", { name: "Misión MB-01" });
  await expect(dock.locator(".case-dock-intro")).toBeVisible();
  await page.getByRole("button", { name: /^Campaign Name/ }).click();
  await expect(page.locator(".mb-popover")).toBeVisible();
  await expect(dock).toHaveClass(/is-collapsed/);
  await page.keyboard.press("Escape");
  await expect(dock.locator(".case-dock-intro")).toBeVisible();
});

test("GA4 and Clarity portals keep their app themes", async ({ page }) => {
  await page.goto("/ga4/informes/eventos");
  await page.locator(".ga-date").click();
  await expect(page.locator(".ga-pop")).toBeVisible();
  expect(await page.locator(".ga-pop").evaluate(node => !!node.closest('[data-app="ga4"]'))).toBe(true);
  await page.goto("/clarity/panel");
  await page.getByRole("button", { name: "Filtros" }).click();
  await expect(page.locator(".cl-filter-drawer")).toBeVisible();
  expect(await page.locator(".cl-filter-drawer").evaluate(node => !!node.closest('[data-app="clarity"]'))).toBe(true);
});
