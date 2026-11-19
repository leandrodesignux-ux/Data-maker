import { describe, expect, it } from "vitest";
import { addDays, format } from "date-fns";
import { dayAt } from "../src/data/clock";
import { DEFAULT_SEED, generateDataset } from "../src/data/generator";
import { CAMPAIGNS } from "../src/data/universe";
import { buildMetabaseData, defaultMetabaseFilters, mbValue, type MetabaseFilters } from "../src/apps/metabase/dashboard-data";

const dataset = generateDataset(DEFAULT_SEED);
const filters = (patch: Partial<MetabaseFilters>): MetabaseFilters => ({ ...defaultMetabaseFilters, cohort: "", traffic: "", entryPoint: "", datePreset: "custom", comparison: "Previous period", ...patch });
describe("Metabase dashboard uses the shared synthetic universe", () => {
  it("MB-01 reveals Browse Page growth and low intent paid traffic", () => {
    const data = buildMetabaseData(dataset, filters({ from: "2026-09-03", to: "2026-09-30", entryPoint: "Browse Page", suspicious: "excludeAll" }));
    const campaign = buildMetabaseData(dataset, filters({ from: "2026-09-03", to: "2026-09-30", entryPoint: "Browse Page", traffic: "Paid", campaign: CAMPAIGNS.bodegasDiscovery, suspicious: "excludeAll" }));
    expect(data.totals.users / data.previousTotals.users).toBeGreaterThan(1.35);
    expect(data.totals.leads / data.previousTotals.leads).toBeLessThan(1.2);
    expect(mbValue(campaign.totals, "usersToLeads")).toBeLessThan(2.5);
  });
  it("MB-02 reveals lower scheduling and no-response cancellations", () => {
    const from = dayAt(120), to = format(addDays(new Date(`${dayAt(179)}T12:00:00Z`), 0), "yyyy-MM-dd");
    const data = buildMetabaseData(dataset, filters({ from, to, sector: "Naves industriales", agentSource: "VIRTUAL" }));
    const recent = mbValue(data.totals, "projectsToVisits"), before = mbValue(data.previousTotals, "projectsToVisits");
    expect(recent).toBeLessThan(before);
    expect(data.totals.cancellations["Sin respuesta del cliente/inquilino"]).toBeGreaterThan(0);
  });
  it("MB-03 restores the apparent user loss when bots are included", () => {
    const scope = { from: "2026-08-12", to: "2026-09-08", channel: "Direct", entryPoint: "Home", sector: "Locales comerciales" };
    const visible = buildMetabaseData(dataset, filters({ ...scope, suspicious: "0" }));
    const all = buildMetabaseData(dataset, filters({ ...scope, suspicious: "All" }));
    expect(1 - visible.totals.users / visible.previousTotals.users).toBeGreaterThan(0.55);
    expect(visible.totals.users).toBeLessThan(all.totals.users);
    expect(visible.totals.leads).toBe(all.totals.leads);
    expect(mbValue(visible.totals, "bounceRate")).toBeLessThan(mbValue(all.totals, "bounceRate"));
  });
});
