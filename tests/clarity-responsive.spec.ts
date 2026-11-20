import { expect, test } from "@playwright/test";

const widths = { desktop: 1400, tablet: 820, mobile: 390 } as const;
type Device = keyof typeof widths;
const devices = Object.keys(widths) as Device[];
const modes = ["click", "scroll"] as const;

function route(device: Device, mode: "click" | "scroll", compare: boolean) {
  const query = new URLSearchParams({ page: "/spots/espacio-demo-azul", url: "/spots/", sector: "Oficinas", device, mode, compare: String(compare), compareDevice: device === "mobile" ? "desktop" : "mobile" });
  return `/clarity/mapas-termicos?${query}`;
}

for (const viewport of [1440, 1920]) test(`Clarity heatmaps fit all layouts at ${viewport}px`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: viewport, height: viewport === 1440 ? 900 : 1080 });
  for (const device of devices) for (const mode of modes) for (const compare of [false, true]) {
    await page.goto(route(device, mode, compare));
    await expect(page.locator(".cl-map-pane")).toHaveCount(compare ? 2 : 1);
    await expect.poll(async () => page.locator(".cl-map-pane .cl-heat-overlay").count()).toBe(compare ? 2 : 1);
    await expect.poll(async () => page.locator(".cl-page-host").first().getAttribute("data-scale")).not.toBe("0");
    await expect.poll(async () => page.locator(".cl-heat-overlay").first().evaluate(canvas => (canvas as HTMLCanvasElement).width)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport + 2);
    const result = await page.locator(".cl-map-pane").evaluateAll(panes => panes.map(pane => {
      const viewport = pane.querySelector<HTMLElement>(".cl-map-viewport")!;
      const host = pane.querySelector<HTMLElement>(".cl-page-host")!;
      const render = pane.querySelector<HTMLElement>(".cl-page-render")!;
      const header = pane.querySelector<HTMLElement>(".cl-site-header")!;
      const canvas = pane.querySelector<HTMLCanvasElement>(".cl-heat-overlay")!;
      const bounds = (node: Element) => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
      const area = bounds(viewport), box = bounds(host), pageBox = bounds(render), heat = bounds(canvas);
      const headerItems = [...header.children].filter(node => getComputedStyle(node).display !== "none").map(bounds);
      const markers = [...pane.querySelectorAll<HTMLElement>(".cl-heat-marker")].map(marker => {
        const name = marker.title;
        const target = [...render.querySelectorAll<HTMLElement>("[data-heat-id]")].find(node => node.dataset.heatId === name);
        return { center: bounds(marker), target: target ? bounds(target) : null };
      });
      let pixelsOutsideElements = 0;
      if (canvas.getAttribute("aria-label")?.includes("clics")) {
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const pageRect = render.getBoundingClientRect();
          const factor = pageRect.width / render.offsetWidth;
          const elements = [...render.querySelectorAll<HTMLElement>("[data-heat-id]")].filter(node => node.getBoundingClientRect().width > 0).map(node => {
            const rect = node.getBoundingClientRect();
            return { left: (rect.left - pageRect.left) / factor, right: (rect.right - pageRect.left) / factor, top: (rect.top - pageRect.top) / factor, bottom: (rect.bottom - pageRect.top) / factor };
          });
          for (let y = 0; y < canvas.height; y += 8) for (let x = 0; x < canvas.width; x += 8) {
            if (pixels[(y * canvas.width + x) * 4 + 3] > 2 && !elements.some(rect => x >= rect.left - 1 && x <= rect.right + 1 && y >= rect.top - 1 && y <= rect.bottom + 1)) pixelsOutsideElements++;
          }
        }
      }
      return { device: pane.getAttribute("data-device") as Device, area, box, pageBox, heat, scale: Number(host.getAttribute("data-scale")), scrollWidth: pane.querySelector<HTMLElement>(".cl-map-scroll")!.scrollWidth, clientWidth: pane.querySelector<HTMLElement>(".cl-map-scroll")!.clientWidth, headerItems, markers, pixelsOutsideElements, canvasWidth: canvas.width, canvasHeight: canvas.height, pageWidth: render.offsetWidth, pageHeight: render.offsetHeight };
    }));
    for (const pane of result) {
      const expected = Math.min(1, pane.area.width / widths[pane.device]);
      expect(pane.scale, `${viewport} ${device} ${mode} ${compare}: scale`).toBeCloseTo(expected, 2);
      expect(Math.abs((pane.area.left + pane.area.right) / 2 - (pane.box.left + pane.box.right) / 2), "centered host").toBeLessThanOrEqual(2);
      expect(pane.box.left).toBeGreaterThanOrEqual(pane.area.left - 2);
      expect(pane.box.right).toBeLessThanOrEqual(pane.area.right + 2);
      expect(pane.pageBox.right).toBeLessThanOrEqual(pane.area.right + 2);
      expect(pane.scrollWidth).toBeLessThanOrEqual(pane.clientWidth + 2);
      expect(pane.heat.left).toBeGreaterThanOrEqual(pane.pageBox.left - 2);
      expect(pane.heat.right).toBeLessThanOrEqual(pane.pageBox.right + 2);
      expect(pane.heat.bottom).toBeLessThanOrEqual(pane.pageBox.bottom + 2);
      expect(pane.canvasWidth).toBe(pane.pageWidth);
      expect(pane.canvasHeight).toBe(pane.pageHeight);
      for (const item of pane.headerItems) expect(item.right).toBeLessThanOrEqual(pane.pageBox.right + 2);
      for (const marker of pane.markers) {
        expect(marker.target).not.toBeNull();
        const centerX = (marker.center.left + marker.center.right) / 2, centerY = (marker.center.top + marker.center.bottom) / 2;
        expect(centerX).toBeGreaterThanOrEqual(marker.target!.left - 2);
        expect(centerX).toBeLessThanOrEqual(marker.target!.right + 2);
        expect(centerY).toBeGreaterThanOrEqual(marker.target!.top - 2);
        expect(centerY).toBeLessThanOrEqual(marker.target!.bottom + 2);
      }
      expect(pane.pixelsOutsideElements, "heat outside interactive elements").toBe(0);
    }
    if (mode === "scroll") {
      const last = page.locator(".cl-scroll-reach>div").last();
      await expect(last).toContainText("100 %");
      if (device === "desktop") await expect(last.locator("strong"), `${viewport}px desktop full-page reach`).not.toHaveText("0,00 %");
      await last.scrollIntoViewIfNeeded();
      const visible = await last.evaluate(node => { const row = node.getBoundingClientRect(), parent = node.parentElement!.getBoundingClientRect(); return row.top >= parent.top - 2 && row.bottom <= parent.bottom + 2; });
      expect(visible, "last scroll row is fully visible").toBe(true);
    }
  }
});

test("device changes preserve scroll depth and comparison panels scroll independently", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route("desktop", "scroll", true));
  await expect(page.locator(".cl-map-pane")).toHaveCount(2);
  const scrolls = page.locator(".cl-map-scroll");
  await scrolls.first().evaluate(node => { node.scrollTop = (node.scrollHeight - node.clientHeight) * .55; });
  await expect.poll(async () => scrolls.first().evaluate(node => node.scrollTop / (node.scrollHeight - node.clientHeight))).toBeGreaterThan(.5);
  await page.getByRole("button", { name: "Tablet", exact: true }).click();
  await expect(page.locator('.cl-map-pane[data-device="tablet"]')).toBeVisible();
  await expect.poll(async () => scrolls.first().evaluate(node => node.scrollTop / (node.scrollHeight - node.clientHeight))).toBeGreaterThan(.5);
  expect(await scrolls.nth(1).evaluate(node => node.scrollTop)).toBe(0);
});

test("changing device recalculates the click list", async ({ page }) => {
  await page.goto(route("desktop", "click", false));
  const list = page.locator(".cl-list-scroll");
  await expect(list.locator(".cl-list-item").first()).toBeVisible();
  const desktop = await list.textContent();
  await page.getByRole("button", { name: "Móvil", exact: true }).click();
  await expect(page.locator('.cl-map-pane[data-device="mobile"]')).toBeVisible();
  await expect.poll(async () => list.textContent()).not.toBe(desktop);
});
