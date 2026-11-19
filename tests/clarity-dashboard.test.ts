import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_SEED, generateDataset } from "../src/data/generator";
import { PAGES } from "../src/data/universe";
import type { Dataset } from "../src/data/model";
import { clHeatElements, clPageSessions, clScroll, clSummary, defaultClFilters, type ClFilters } from "../src/apps/clarity/clarity-data";
let dataset: Dataset;
beforeAll(() => { dataset = generateDataset(DEFAULT_SEED); }, 60_000);

describe("Clarity panel and heatmap discoveries", () => {
  it("CL-01 shows failed gallery clicks after filtering spot pages", () => {
    const filters: ClFilters = { ...defaultClFilters, datePreset: "30d", page: PAGES.spot, url: "/spots/", sector: "Bodegas" };
    const sessions = clPageSessions(dataset, filters), deadRate = sessions.filter(s => s.flags.deadClick).length / sessions.length;
    const dead = clHeatElements(dataset, { ...filters, clickKind: "dead" });
    console.log("CL-01", { deadRate, gallery: dead.filter(row => row.elementId.startsWith("gallery")).map(row => ({ id: row.elementId, clicks: row.clicks })) });
    expect(deadRate).toBeGreaterThan(.08);
    expect(dead.some(row => row.elementId === "gallery-main")).toBe(true);
    expect(dead.some(row => row.elementId === "gallery-thumbnail")).toBe(true);
  });
  it("CL-02 compares desktop and mobile reach at the contact panel", () => {
    const filters: ClFilters = { ...defaultClFilters, datePreset: "30d", page: PAGES.spot, url: "/spots/", sector: "Oficinas", channel: "Organic Search", device: "desktop", compareDevice: "mobile" };
    const desktop = clScroll(dataset, filters), mobile = clScroll(dataset, filters, true);
    console.log("CL-02", { desktopReach75: desktop.reach(75), mobileReach75: mobile.reach(75), desktopMean: desktop.mean, mobileMean: mobile.mean });
    expect(desktop.reach(75)).toBeLessThan(.32);
    expect(mobile.reach(75) - desktop.reach(75)).toBeGreaterThan(.04);
  });
  it("CL-03 links mobile Safari rage clicks, search heat, and JavaScript errors", () => {
    const filters: ClFilters = { ...defaultClFilters, datePreset: "30d", page: PAGES.home, sector: "Locales comerciales", device: "mobile", browser: "Safari" };
    const summary = clSummary(dataset, filters), heat = clHeatElements(dataset, { ...filters, clickKind: "rage" });
    console.log("CL-03", { rageRate: summary.rageClicks / summary.total, jsRate: summary.jsErrors / summary.total, searchClicks: heat.find(row => row.elementId === "location-search")?.clicks });
    expect(summary.rageClicks / summary.total).toBeGreaterThan(.1);
    expect(summary.jsErrors / summary.total).toBeGreaterThan(.1);
    expect(heat[0]?.elementId).toBe("location-search");
  });
  it("memoizes the filtered slice and honors URL operators", () => {
    const filters = { ...defaultClFilters, url: "/spots/", urlOperator: "startsWith" as const };
    expect(clPageSessions(dataset, filters)).toBe(clPageSessions(dataset, filters));
    expect(clPageSessions(dataset, filters).every(s => s.pageviews.some(view => view.path.startsWith("/spots/")))).toBe(true);
  });
});
