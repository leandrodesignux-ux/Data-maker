import { markTouched, stageAtLeast } from "../generator";
import { dayAt } from "../clock";
import { CRM_STAGES } from "../universe";
import { hash32 } from "../prng";
import { crmCohort, stageRate } from "./metrics";
import { check, ratio, type Scenario } from "./types";

export const mb02: Scenario = {
  id: "MB-02",
  apply(dataset) {
    const cutoff = dayAt(120);
    const eligible = dataset.crm.filter(r => r.scenarioKey === "MB-02" && stageAtLeast(r, "project"));
    const scheduledIds = new Set<string>();
    for (const [recent, probability] of [[false, 0.30], [true, 0.20]] as const) {
      const period = eligible.filter(r => (r.day >= cutoff) === recent).sort((a, b) => hash32(a.id, dataset.seed) - hash32(b.id, dataset.seed));
      for (const record of period.slice(0, Math.round(period.length * probability))) scheduledIds.add(record.id);
    }
    for (const record of eligible) {
      const recent = record.day >= cutoff;
      const scheduled = scheduledIds.has(record.id);
      if (!scheduled) {
        record.stage = "project";
        for (const stage of CRM_STAGES.slice(2)) delete record.stageDates[stage];
        record.status = "cancelled";
        record.cancellationReason = recent ? "Sin respuesta del cliente/inquilino" : "Espacio no adecuado – Zona";
      } else if (!stageAtLeast(record, "requestVisit")) {
        record.stage = "requestVisit"; record.stageDates.requestVisit = record.createdAt;
        record.status = "open"; record.cancellationReason = null;
      }
      markTouched(record, "MB-02");
    }
  },
  assertions(dataset) {
    const before = crmCohort(dataset, "MB-02", 0, 120), after = crmCohort(dataset, "MB-02", 120, 180);
    const recentProjects = after.filter(r => stageAtLeast(r, "project"));
    return [
      check("Projects→request visits, before", stageRate(before, "project", "requestVisit"), ">", 0.25),
      check("Projects→request visits, after", stageRate(after, "project", "requestVisit"), "<", 0.25),
      check("No-response share among recent projects", ratio(recentProjects.filter(r => r.cancellationReason === "Sin respuesta del cliente/inquilino").length, recentProjects.length), ">", 0.65),
    ];
  },
};
