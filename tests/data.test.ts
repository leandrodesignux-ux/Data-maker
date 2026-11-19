import { beforeAll, describe, expect, it } from "vitest";
import { createBaseDataset, DEFAULT_SEED, generateDataset } from "../src/data/generator";
import type { Dataset } from "../src/data/model";
import { hash32 } from "../src/data/prng";
import { aggregateBy, attentionDistribution, comparePeriods, cvrMetrics, eventFunnel, heatmapByElement, replayScript, scrollDistribution, timeSeries } from "../src/data/queries";
import { scenarios } from "../src/data/scenarios";

let base: Dataset;
let full: Dataset;
beforeAll(() => { base = createBaseDataset(DEFAULT_SEED); full = generateDataset(DEFAULT_SEED); }, 60_000);

function fingerprint(dataset: Dataset): number {
  let hash = 0;
  for (const session of dataset.sessions) hash = hash32(JSON.stringify(session), hash);
  for (const record of dataset.crm) hash = hash32(JSON.stringify(record), hash);
  return hash;
}

describe("deterministic shared universe", () => {
  it("repeats every generated record for the same seed", () => {
    const second = generateDataset(DEFAULT_SEED);
    expect(second.sessions.length).toBe(full.sessions.length);
    expect(second.crm.length).toBe(full.crm.length);
    expect(fingerprint(second)).toBe(fingerprint(full));
  }, 60_000);

  it("keeps the base within 40–60k sessions and without large unexplained daily jumps", () => {
    console.log(`Dataset: base=${base.sessions.length} sessions, full=${full.sessions.length} sessions, crm=${full.crm.length} leads`);
    expect(base.sessions.length).toBeGreaterThan(40_000);
    expect(base.sessions.length).toBeLessThan(60_000);
    expect(full.sessions.length).toBeGreaterThan(40_000);
    expect(full.sessions.length).toBeLessThan(60_000);
    const daily = timeSeries(base, "sessions", "day").map(row => row.value);
    const weekly = Array.from({ length: Math.floor(daily.length / 7) }, (_, i) => daily.slice(i * 7, i * 7 + 7).reduce((sum, value) => sum + value, 0));
    for (let i = 1; i < weekly.length; i++) expect(Math.abs(weekly[i] / weekly[i - 1] - 1)).toBeLessThan(0.25);
    const windows = Array.from({ length: 6 }, (_, i) => {
      const from = new Date("2026-04-04T12:00:00Z"); from.setUTCDate(from.getUTCDate() + i * 28);
      const to = new Date(from); to.setUTCDate(to.getUTCDate() + 28);
      const filter = { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
      return cvrMetrics(base, filter).usersToLeads;
    });
    const meanCvr = windows.reduce((sum, value) => sum + value, 0) / windows.length;
    for (const value of windows) expect(value / meanCvr).toBeGreaterThan(0.65);
    for (const value of windows) expect(value / meanCvr).toBeLessThan(1.35);
    expect(base.sessions.every(s => s.events[0]?.name === "session_start" && s.pageviews[0]?.path === s.landingPage)).toBe(true);
  });

  it("keeps each scenario's writes in its own cohort", () => {
    const original = new Map(base.sessions.map(s => [s.id, s]));
    for (const session of full.sessions) {
      expect(session.touchedBy.every(id => id === session.scenarioKey)).toBe(true);
      const before = original.get(session.id);
      if (!before) { expect(session.touchedBy).toHaveLength(1); continue; }
      if (!session.touchedBy.length) expect(JSON.stringify(session)).toBe(JSON.stringify(before));
    }
    const originalCrm = new Map(base.crm.map(r => [r.id, r]));
    const finalCrm = new Map(full.crm.map(r => [r.id, r]));
    for (const record of base.crm) if (!finalCrm.has(record.id)) expect(["GA-01", "GA-03"]).toContain(record.scenarioKey);
    for (const record of full.crm) {
      expect(record.touchedBy.every(id => id === record.scenarioKey)).toBe(true);
      if (!record.touchedBy.length) expect(JSON.stringify(record)).toBe(JSON.stringify(originalCrm.get(record.id)));
    }
  }, 60_000);
});

describe("nine scenario assertions", () => {
  for (const scenario of scenarios) it(`${scenario.id} has visible symptom and filtered cause`, () => {
    const results = scenario.assertions(full);
    console.log(`${scenario.id} ${JSON.stringify(results.map(({ name, actual, operator, expected }) => ({ name, actual: Number(actual.toFixed(4)), operator, expected })))}`);
    for (const result of results) expect(result.passed, `${scenario.id}: ${result.name} = ${result.actual} ${result.operator} ${result.expected}`).toBe(true);
  });
});

describe("pure memoized queries", () => {
  it("memoizes series and dimensions while preserving the dataset", () => {
    const filter = { from: "2026-09-01", to: "2026-10-01" };
    const series = timeSeries(full, "sessions", "week", filter);
    expect(timeSeries(full, "sessions", "week", filter)).toBe(series);
    expect(aggregateBy(full, "channel", "sessions", filter).reduce((sum, row) => sum + row.value, 0)).toBe(series.reduce((sum, row) => sum + row.value, 0));
    expect(comparePeriods(full, "sessions", filter).previous).toBeGreaterThan(0);
  });

  it("calculates funnels, heat, scroll, attention and replay from source records", () => {
    const filter = { sector: "Bodegas" as const, entryPoint: "Spot Detail" as const };
    expect(eventFunnel(full, ["session_start", "page_view", "clientInAvailableSpotDetail"], filter, "device").length).toBeGreaterThan(0);
    expect(cvrMetrics(full, filter).deadClickRate).toBeGreaterThan(0);
    expect(heatmapByElement(full, filter).some(row => row.elementId.startsWith("gallery-"))).toBe(true);
    expect(scrollDistribution(full, filter).reduce((sum, row) => sum + row.sessions, 0)).toBeGreaterThan(0);
    expect(attentionDistribution(full, filter)).toHaveLength(4);
    expect(replayScript(full, full.sessions.find(s => s.scenarioKey === "CL-01")!.id)[0].type).toBe("navigate");
  });
});
