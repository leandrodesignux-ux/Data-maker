import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_SEED, generateDataset } from "../src/data/generator";
import type { Dataset } from "../src/data/model";
import { CAMPAIGNS } from "../src/data/universe";
import { defaultGaSteps, defaultGaFilters, gaEventBreakdown, gaEventRows, gaFunnel, gaPageTableRows, gaSessions, gaTrafficRows, gaTrafficTableRows, type GaFilters } from "../src/apps/ga4/ga4-data";

let dataset: Dataset;
beforeAll(() => { dataset = generateDataset(DEFAULT_SEED); }, 60_000);
const condition = (dimension: string, value: string) => ({ dimension, operator: "equals", value });

describe("GA4 discoveries from report controls", () => {
  it("recalculates secondary dimensions without changing report totals", () => {
    const filters: GaFilters = { ...defaultGaFilters, secondary: "device" };
    const traffic = gaTrafficTableRows(dataset, filters), pages = gaPageTableRows(dataset, filters);
    expect(traffic.some(row => row.secondary === "desktop")).toBe(true);
    expect(traffic.reduce((sum, row) => sum + row.sessions, 0)).toBe(gaSessions(dataset, filters).length);
    expect(pages.reduce((sum, row) => sum + row.views, 0)).toBe(gaSessions(dataset, filters).reduce((sum, row) => sum + row.pageviews.length, 0));
  });
  it("GA-01: the device breakdown exposes the desktop contact loss", () => {
    const filters: GaFilters = { ...defaultGaFilters, datePreset: "90d", conditions: JSON.stringify([condition("channel", "Organic Search"), condition("sector", "Oficinas"), condition("entryPoint", "Browse Page")]) };
    const result = gaFunnel(dataset, filters, defaultGaSteps, "device", false);
    const mobile = result.rows.find(row => row.key === "mobile")!, desktop = result.rows.find(row => row.key === "desktop")!;
    const mobileRate = mobile.counts[3] / mobile.counts[2], desktopRate = desktop.counts[3] / desktop.counts[2];
    const cardToDetailAbandonment = 1 - result.total[2] / result.total[1];
    expect(cardToDetailAbandonment).toBeGreaterThan(0.02);
    expect(cardToDetailAbandonment).toBeLessThan(0.06);
    console.log("GA4 GA-01 funnel", { mobileRate, desktopRate, totalRate: result.total[3] / result.total[2] });
    expect(desktopRate).toBeLessThan(0.02);
    expect(mobileRate).toBeGreaterThan(0.09);
  });
  it("GA-02: traffic campaign dimension reveals paid social volume and low intent", () => {
    const filters: GaFilters = { ...defaultGaFilters, datePreset: "month", dimension: "campaign" };
    const rows = gaTrafficRows(dataset, filters), prior = gaTrafficRows(dataset, filters, "all", true);
    const current = rows.find(row => row.key === CAMPAIGNS.socialAwareness)!, previous = prior.find(row => row.key === CAMPAIGNS.socialAwareness)!;
    console.log("GA4 GA-02 traffic", { sessions: current.sessions, prior: previous.sessions, growth: current.sessions / previous.sessions, engagement: current.engagementRate, activeSec: current.averageTimeSec, keyEvents: current.keyEvents });
    expect(current.sessions / previous.sessions).toBeGreaterThan(1.5);
    expect(current.engagementRate).toBeLessThan(.2);
    expect(current.averageTimeSec).toBeLessThan(10);
    expect(current.keyEvents / current.sessions).toBeLessThan(.01);
  });
  it("GA-03: event detail and Safari/iOS filter expose missing requests while clicks remain", () => {
    const filters: GaFilters = { ...defaultGaFilters, datePreset: "custom", from: "2026-07-15", to: "2026-09-30", conditions: JSON.stringify([condition("browser", "Safari"), condition("os", "iOS"), condition("sector", "Bodegas"), condition("entryPoint", "Spot Detail")]) };
    const current = gaEventRows(dataset, filters), breakdown = gaEventBreakdown(dataset, filters, "clientRequestedWhatsappForm", "browser");
    const sessions = gaSessions(dataset, filters);
    const pre = sessions.filter(s => s.day < "2026-08-12"), post = sessions.filter(s => s.day >= "2026-08-12");
    const rate = (rows: typeof sessions, name: string) => rows.filter(s => s.events.some(event => event.name === name)).length / Math.max(1, rows.length);
    const clickPre = rate(pre, "clientClickedWhatsappForm"), clickPost = rate(post, "clientClickedWhatsappForm");
    const requestPre = rate(pre, "clientRequestedWhatsappForm"), requestPost = rate(post, "clientRequestedWhatsappForm");
    console.log("GA4 GA-03 event", { requestPre, requestPost, clickPre, clickPost, breakdown: breakdown[0]?.key });
    expect(current.some(row => row.key === "clientRequestedWhatsappForm")).toBe(true);
    expect(breakdown[0]?.key).toBe("Safari");
    expect(requestPost / clickPost).toBeLessThan(requestPre / clickPre * .55);
    expect(clickPost / clickPre).toBeGreaterThan(.75);
  });
});
