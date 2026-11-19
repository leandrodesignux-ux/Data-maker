import { test, expect } from "@playwright/test";
import { cases } from "../src/cases/registry";

type Move = { path?: string; values?: Record<string, string | null> };
const paths: Record<string, Move[]> = {
  "MB-01": [{ values: { traffic: "Paid" } }, { values: { campaign: "Ruta Bodega Horizonte" } }, { values: { traffic: "Organic", campaign: null } }],
  "MB-02": [{ values: { agentSource: "VIRTUAL" } }, { values: { visitStatus: "cancelled" } }],
  "MB-03": [{ values: { suspicious: "All" } }, { values: { suspicious: "1" } }, { values: { suspicious: "excludeAll" } }],
  "GA-01": [{ values: { breakdown: "device" } }],
  "GA-02": [{ values: { dimension: "campaign" } }, { values: { conditions: JSON.stringify([{ dimension: "channel", operator: "equals", value: "Paid Social" }]) } }],
  "GA-03": [{ path: "/ga4/informes/eventos/clientRequestedWhatsappForm" }, { values: { secondary: "browser" } }, { values: { conditions: JSON.stringify([{ dimension: "browser", operator: "equals", value: "Safari" }]) } }, { values: { conditions: JSON.stringify([{ dimension: "browser", operator: "equals", value: "Safari" }, { dimension: "os", operator: "equals", value: "iOS" }]) } }],
  "CL-01": [{ path: "/clarity/mapas-termicos" }, { values: { clickKind: "dead" } }],
  "CL-02": [{ path: "/clarity/mapas-termicos", values: { mode: "scroll" } }, { values: { compare: "true", compareDevice: "mobile" } }],
  "CL-03": [{ values: { browser: "Safari" } }, { path: "/clarity/mapas-termicos", values: { clickKind: "rage" } }, { path: "/clarity/panel", values: { behavior: "jsError" } }],
};

for (const definition of cases) test(`${definition.id} completes every guided step on its investigation route`, async ({ page }) => {
  await page.goto(`/casos/${definition.id}`);
  const dock = page.getByRole("complementary", { name: `Misión ${definition.id}` });
  await expect(dock).toBeVisible({ timeout: 30000 });
  const complete = async (id: string) => expect(dock.locator(`[data-step-id="${id}"]`)).toHaveAttribute("data-complete", "true", { timeout: 30000 });
  const moves = [...paths[definition.id]];
  let nextStep = 0;
  for (const objective of definition.objectives) {
    if (await dock.locator(`[data-step-id="${objective.id}"]`).getAttribute("data-complete") === "true") { nextStep++; continue; }
    const move = moves.shift();
    expect(move, `Missing route for ${definition.id} step ${objective.id}`).toBeDefined();
    const target = new URL(page.url());
    if (move?.path) target.pathname = move.path;
    for (const [key, value] of Object.entries(move?.values ?? {})) {
      if (value === null) target.searchParams.delete(key);
      else target.searchParams.set(key, value);
    }
    await page.goto(target.href);
    await complete(objective.id);
    nextStep++;
  }
  expect(nextStep).toBe(definition.objectives.length);
  await expect(dock.locator('[data-complete="true"]')).toHaveCount(definition.objectives.length);
  await page.reload();
  await expect(dock.locator('[data-complete="true"]')).toHaveCount(definition.objectives.length);
  for (const quiz of definition.quiz) {
    const item = dock.locator(`[data-quiz-id="${quiz.id}"]`);
    if (quiz.kind === "multiple") await item.getByRole("radio").nth(quiz.answer).check();
    else await item.getByRole("textbox").fill(String(quiz.answer));
    await item.getByRole("button", { name: "Comprobar" }).click();
    await expect(item).toHaveClass(/solved/);
  }
  await expect(dock).toContainText("Diagnóstico.");
  await page.goto("/casos");
  await expect(page.locator(`[data-case-id="${definition.id}"] .cases-status`)).toContainText("resuelto");
});

test("MB-01 marks steps through Metabase filter controls", async ({ page }) => {
  await page.goto("/casos/MB-01");
  const dock = page.getByRole("complementary", { name: "Misión MB-01" });
  await page.getByRole("button", { name: /^Traffic Type/ }).click();
  await page.getByRole("button", { name: "Paid", exact: true }).click();
  await expect(dock.locator('[data-step-id="paid"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("button", { name: /^Campaign Name/ }).click();
  await page.getByRole("checkbox", { name: "Ruta Bodega Horizonte" }).check();
  await expect(dock.locator('[data-step-id="campaign"]')).toHaveAttribute("data-complete", "true");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Clear Campaign Name" }).click();
  await page.getByRole("button", { name: /^Traffic Type/ }).click();
  await page.getByRole("button", { name: "Organic", exact: true }).click();
  await expect(dock.locator('[data-step-id="organic"]')).toHaveAttribute("data-complete", "true");
});

test("GA-01 marks the device breakdown selected in Exploration", async ({ page }) => {
  await page.goto("/casos/GA-01");
  const dock = page.getByRole("complementary", { name: "Misión GA-01" });
  await expect(dock.locator('[data-step-id="funnel"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("combobox", { name: "Desglose del embudo" }).selectOption("device");
  await expect(dock.locator('[data-step-id="device"]')).toHaveAttribute("data-complete", "true");
});

test("CL-01 marks heatmap navigation and the failed-click filter", async ({ page }) => {
  await page.goto("/casos/CL-01");
  const dock = page.getByRole("complementary", { name: "Misión CL-01" });
  await expect(dock.locator('[data-step-id="spot"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("link", { name: "Mapas Térmicos" }).click();
  await expect(dock.locator('[data-step-id="map"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("combobox", { name: "Tipo de clics" }).selectOption("dead");
  await expect(dock.locator('[data-step-id="dead"]')).toHaveAttribute("data-complete", "true");
});

test("MB-02 and MB-03 accept their investigative filters", async ({ page }) => {
  await page.goto("/casos/MB-02");
  const dock2 = page.getByRole("complementary", { name: "Misión MB-02" });
  await expect(dock2.locator('[data-step-id="sector"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("button", { name: /^Agent Source/ }).click();
  await page.getByRole("checkbox", { name: "VIRTUAL" }).check();
  await expect(dock2.locator('[data-step-id="agent"]')).toHaveAttribute("data-complete", "true");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Estatus de visita/ }).click();
  await page.getByRole("checkbox", { name: "cancelled" }).check();
  await expect(dock2.locator('[data-step-id="cancel"]')).toHaveAttribute("data-complete", "true");
  await page.goto("/casos/MB-03");
  const dock3 = page.getByRole("complementary", { name: "Misión MB-03" });
  for (const [value, step] of [["All", "all"], ["1", "bots"], ["Exclude all", "clean"]]) {
    await page.getByRole("button", { name: /^User Sospechoso/ }).click();
    await page.getByRole("button", { name: value, exact: true }).click();
    await expect(dock3.locator(`[data-step-id="${step}"]`)).toHaveAttribute("data-complete", "true");
  }
});

test("GA-02 identifies the weak campaign through report controls", async ({ page }) => {
  await page.goto("/casos/GA-02");
  const dock = page.getByRole("complementary", { name: "Misión GA-02" });
  await expect(dock.locator('[data-step-id="traffic"]')).toHaveAttribute("data-complete", "true");
  await page.locator(".ga-primary-dimension select").selectOption("campaign");
  await expect(dock.locator('[data-step-id="campaign"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("button", { name: "Añadir filtro" }).click();
  await page.getByRole("button", { name: "Añadir condición" }).click();
  await page.locator('input[aria-label="Valor 1"]').fill("Paid Social");
  await page.getByRole("dialog").getByRole("button", { name: "Aplicar" }).click();
  await expect(dock.locator('[data-step-id="social"]')).toHaveAttribute("data-complete", "true");
});

test("GA-03 follows event detail, browser and operating-system filters", async ({ page }) => {
  await page.goto("/casos/GA-03");
  const dock = page.getByRole("complementary", { name: "Misión GA-03" });
  await page.getByRole("link", { name: "clientRequestedWhatsappForm" }).click();
  await expect(dock.locator('[data-step-id="detail"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("combobox", { name: "Dimensión secundaria del evento" }).selectOption("browser");
  await expect(dock.locator('[data-step-id="browser"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("button", { name: "Añadir filtro" }).click();
  await page.getByRole("button", { name: "Añadir condición" }).click();
  await page.getByRole("combobox", { name: "Dimensión 1" }).selectOption("browser");
  await page.locator('input[aria-label="Valor 1"]').fill("Safari");
  await page.getByRole("dialog").getByRole("button", { name: "Aplicar" }).click();
  await expect(dock.locator('[data-step-id="safari"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("button", { name: "Añadir filtro" }).click();
  await page.getByRole("button", { name: "Añadir condición" }).click();
  await page.getByRole("combobox", { name: "Dimensión 2" }).selectOption("os");
  await page.locator('input[aria-label="Valor 2"]').fill("iOS");
  await page.getByRole("dialog").getByRole("button", { name: "Aplicar" }).click();
  await expect(dock.locator('[data-step-id="ios"]')).toHaveAttribute("data-complete", "true");
});

test("CL-02 compares scroll and CL-03 connects Safari to JavaScript errors", async ({ page }) => {
  await page.goto("/casos/CL-02");
  const dock2 = page.getByRole("complementary", { name: "Misión CL-02" });
  await expect(dock2.locator('[data-step-id="desktop"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("link", { name: "Mapas Térmicos" }).click();
  await page.getByRole("button", { name: "Desplazamiento" }).click();
  await expect(dock2.locator('[data-step-id="scroll"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("button", { name: "Comparar" }).click();
  await expect(dock2.locator('[data-step-id="compare"]')).toHaveAttribute("data-complete", "true");
  await page.goto("/casos/CL-03");
  const dock3 = page.getByRole("complementary", { name: "Misión CL-03" });
  await page.getByRole("button", { name: "Filtros" }).click();
  await page.locator("#cl-browser-filter").selectOption("Safari");
  await page.getByRole("button", { name: "Cerrar filtros" }).click();
  await expect(dock3.locator('[data-step-id="safari"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("link", { name: "Mapas Térmicos" }).click();
  await page.getByRole("combobox", { name: "Tipo de clics" }).selectOption("rage");
  await expect(dock3.locator('[data-step-id="rage"]')).toHaveAttribute("data-complete", "true");
  await page.getByRole("link", { name: "Panel" }).click();
  await page.getByRole("button", { name: "Filtros" }).click();
  await page.locator("#cl-behavior-filter").selectOption("jsError");
  await page.getByRole("button", { name: "Cerrar filtros" }).click();
  await expect(dock3.locator('[data-step-id="errors"]')).toHaveAttribute("data-complete", "true");
});

test("catalog filters, hint penalty and collapse survive navigation", async ({ page }) => {
  await page.goto("/casos");
  await expect(page.locator(".cases-page")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("combobox", { name: "Filtrar por app" }).selectOption("clarity");
  await expect(page.locator(".cases-card")).toHaveCount(3);
  await page.getByRole("combobox", { name: "Filtrar por dificultad" }).selectOption("Inicial");
  await expect(page.locator(".cases-card")).toHaveCount(1);
  await page.locator('[data-case-id="CL-01"]').click();
  const dock = page.getByRole("complementary", { name: "Misión CL-01" });
  await expect(dock.locator('[data-step-id="spot"]')).toHaveAttribute("data-complete", "true");
  await dock.getByRole("button", { name: /Mostrar pista/ }).click();
  await expect(dock).toContainText("Empieza en Ideas");
  await page.getByRole("button", { name: "Contraer misión" }).click();
  await expect(page.getByRole("button", { name: "Expandir misión" })).toBeVisible();
  await page.reload();
  await expect(dock).toContainText("Empieza en Ideas");
  await expect(dock).toContainText("10 pts");
});
