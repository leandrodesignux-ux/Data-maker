import { expect, test, type Page } from "@playwright/test";

const routes = [
  "/metabase/dashboard/growth-full-picture",
  "/ga4/informes/panoramico",
  "/ga4/informes/adquisicion-trafico",
  "/ga4/informes/eventos",
  "/ga4/informes/eventos/clientRequestedWhatsappForm",
  "/ga4/informes/paginas",
  "/ga4/explorar/embudo",
  "/clarity/panel",
  "/clarity/mapas-termicos",
];
const candidates = "button, a, select, input, [role=button], [role=tab], [tabindex]";
type Candidate = { selector: string; label: string; kind: string; unavailable: boolean; active: boolean };

async function ready(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.locator("[data-app]").waitFor();
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-app]");
    return !!root && !root.querySelector(".ga-skeleton, .cl-skeleton, .mb-loading");
  }, undefined, { timeout: 30_000 });
}

async function inventory(page: Page): Promise<Candidate[]> {
  return page.evaluate((selector) => {
    const nodes = new Set<Element>(document.querySelectorAll(selector));
    document.querySelectorAll("[data-app] *").forEach(el => {
      if (getComputedStyle(el).cursor === "pointer") nodes.add(el);
    });
    const path = (el: Element): string => {
      const pieces: string[] = [];
      for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
        const siblings = node.parentElement ? [...node.parentElement.children] : [];
        pieces.unshift(`${node.tagName.toLowerCase()}:nth-child(${siblings.indexOf(node) + 1})`);
      }
      return `body > ${pieces.join(" > ")}`;
    };
    return [...nodes].filter(el => {
      const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && !el.parentElement?.closest(selector);
    }).map(el => ({
      selector: path(el),
      label: (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 80),
      kind: el.tagName.toLowerCase(),
      unavailable: el.hasAttribute("data-unavailable") || !!el.closest("[data-unavailable]"),
      active: el.matches(".active, .selected, [aria-selected=true], [aria-current=page], [aria-pressed=true]"),
    }));
  }, candidates);
}

test.describe.configure({ mode: "parallel" });
for (const route of routes) {
  test(`controles visibles responden: ${route}`, async ({ page }) => {
    test.setTimeout(600_000);
    await ready(page, route);
    const controls = await inventory(page);
    const failures: string[] = [];
    for (const control of controls) {
      if (control.unavailable) continue;
      // The selected tab or navigation link is idempotent by design.
      if (control.active) continue;
      // Copy actions change the clipboard, while canvas export produces a download.
      if (/copiar enlace|share dashboard|copy link|descargar imagen/i.test(control.label)) continue;
      // Drag handles reorder cards by pointer movement; a plain click is not their action.
      if (/arrastrar/i.test(control.label)) continue;
      await ready(page, route);
      const target = page.locator(control.selector);
      if (!await target.count() || !await target.isVisible()) continue;
      // Native disabled pagination controls have a visible disabled state and cannot be activated.
      if (await target.isDisabled()) continue;
      // A link to the current route is an idempotent navigation target.
      if (control.kind === "a" && new URL(await target.getAttribute("href") || route, "http://127.0.0.1:3000").pathname === route && !(await target.getAttribute("href"))?.includes("?")) continue;
      const before = await page.evaluate(() => ({
        url: location.href,
        body: document.body.innerText,
        dialogs: document.querySelectorAll("[role=dialog], [data-state=open], [role=menu]").length,
        storage: JSON.stringify(localStorage),
        checks: [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].map(input => input.checked).join(","),
      }));
      const beforeControl = await target.evaluate(el => el.outerHTML);
      const beforeValue = control.kind === "input" || control.kind === "select" ? await target.inputValue() : null;
      const beforeChecked = control.kind === "input" ? await target.isChecked().catch(() => null) : null;
      let changed = false;
      try {
        if (control.kind === "select") {
          const values = await target.locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
          const current = await target.inputValue();
          const next = values.find(value => value !== current);
          if (!next) continue; // A one-option select has no alternate value.
          await target.selectOption(next);
        } else if (control.kind === "input") {
          const type = await target.getAttribute("type");
          if (type === "checkbox") await target.setChecked(!beforeChecked);
          else if (type === "radio") { if (beforeChecked) continue; await target.check(); }
          else if (type === "hidden") continue;
          else await target.fill("auditoría");
        } else await target.click({ timeout: 2500 });
        if (control.kind === "a") {
          const href = await target.getAttribute("href").catch(() => null);
          if (href && new URL(href, page.url()).href !== before.url) await page.waitForURL(new URL(href, page.url()).href, { timeout: 5_000 }).catch(() => {});
        }
        await page.waitForTimeout(180);
        const after = await page.evaluate(() => ({
          url: location.href,
          body: document.body.innerText,
          dialogs: document.querySelectorAll("[role=dialog], [data-state=open], [role=menu]").length,
          storage: JSON.stringify(localStorage),
          checks: [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].map(input => input.checked).join(","),
        }));
        changed = JSON.stringify(after) !== JSON.stringify(before);
        changed ||= beforeControl !== await target.evaluate(el => el.outerHTML).catch(() => "");
        if (control.kind === "input" || control.kind === "select") changed ||= await target.inputValue().catch(() => "") !== beforeValue;
        if (beforeChecked !== null) changed ||= await target.isChecked().catch(() => beforeChecked) !== beforeChecked;
        changed ||= await target.getAttribute("aria-expanded").catch(() => null) === "true";
        if (!changed) {
          await page.waitForTimeout(800); // Client navigation and query state can settle after the click.
          changed = (await page.evaluate(() => location.href + document.body.innerText + JSON.stringify(localStorage) + [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].map(input => input.checked).join(","))) !== before.url + before.body + before.storage + before.checks;
        }
      } catch (error) {
        failures.push(`${control.label || control.kind} · ${control.selector} · ${String(error).slice(0, 100)}`);
        continue;
      }
      if (!changed) failures.push(`${control.label || control.kind} · ${control.selector}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}

test("el control no disponible conserva foco, muestra ayuda y bloquea activación", async ({ page }) => {
  await ready(page, "/ga4/informes/panoramico");
  const apps = page.getByRole("button", { name: "Aplicaciones" });
  await expect(apps).toHaveAttribute("aria-disabled", "true");
  await apps.focus();
  await expect(page.getByRole("tooltip")).toHaveText("No disponible en el simulador");
  const before = page.url();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await apps.dispatchEvent("click");
  expect(page.url()).toBe(before);
});

test("copiar enlace y descargar mapa producen sus resultados", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:3000" });
  await ready(page, "/metabase/dashboard/growth-full-picture");
  await page.getByRole("button", { name: "Share dashboard" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
  await ready(page, "/clarity/mapas-termicos");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar imagen" }).click();
  expect((await download).suggestedFilename()).toMatch(/^clarity-click-.*\.png$/);
});
