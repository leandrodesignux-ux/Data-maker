import { describe, expect, it } from "vitest";
import { cases, caseById } from "../src/cases/registry";
import { caseSchema } from "../src/cases/schema";
import { detectStep } from "../src/cases/engine/detectors";
import { caseScore, caseStatus, type CaseProgress } from "../src/cases/engine/progress";
import { defaultMetabaseFilters } from "../src/apps/metabase/dashboard-data";
import { defaultGaFilters } from "../src/apps/ga4/ga4-data";
import { defaultClFilters } from "../src/apps/clarity/clarity-data";

describe("guided case definitions and engine", () => {
  it("registers nine valid, connected cases with unique objectives", () => {
    expect(cases).toHaveLength(9);
    expect(new Set(cases.map(item => item.id)).size).toBe(9);
    for (const item of cases) {
      expect(caseSchema.safeParse(item).success).toBe(true);
      expect(item.startRoute).toContain(`case=${item.id}`);
      expect(item.relatedCases.every(id => !!caseById[id])).toBe(true);
      expect(item.hints).toHaveLength(3);
    }
  });
  it("requires every route, state, query and text clause", () => {
    const detector = { path: "/ga4/explorar/embudo", filters: { datePreset: "90d" }, query: { breakdown: "device" }, includes: { conditions: "Oficinas" } };
    const observation = { pathname: "/ga4/explorar/embudo", filters: { datePreset: "90d", conditions: '[{"value":"Oficinas"}]' }, query: new URLSearchParams("breakdown=device") };
    expect(detectStep(detector, observation)).toBe(true);
    expect(detectStep(detector, { ...observation, query: new URLSearchParams("breakdown=browser") })).toBe(false);
  });
  it("declares initial filters in the URL and leaves action steps incomplete", () => {
    for (const item of cases) {
      const url = new URL(item.startRoute, "https://data-maker.invalid");
      const defaults = item.app === "metabase" ? defaultMetabaseFilters : item.app === "ga4" ? defaultGaFilters : defaultClFilters;
      const filters = { ...defaults } as Record<string, unknown>;
      for (const [key, raw] of url.searchParams) if (key in filters) {
        const prior = filters[key];
        filters[key] = typeof prior === "boolean" ? raw === "true" : typeof prior === "number" ? Number(raw) : raw;
      }
      if (item.app === "metabase") expect(url.searchParams.has("cohort")).toBe(true);
      if (item.id === "GA-01") expect(url.searchParams.has("conditions")).toBe(true);
      for (const objective of item.objectives) if (objective.kind === "action") {
        expect(detectStep(objective.detector, { pathname: url.pathname, query: url.searchParams, filters }), `${item.id}:${objective.id} completes at launch`).toBe(false);
      }
    }
  });
  it("scores completed work and penalizes premature hints and wrong answers", () => {
    const item = caseById["CL-01"];
    const progress: CaseProgress = { startedAt: 1, completedSteps: item.objectives.map(step => step.id), answers: Object.fromEntries(item.quiz.map(q => [q.id, true])), revealedHints: 1, hintPenalties: 1, wrongAnswers: 1, solutionRevealed: true, solutionPenalty: false, resolvedAt: 2 };
    expect(caseStatus(progress)).toBe("resuelto");
    expect(caseScore(item, progress)).toBe(85);
    expect(caseScore(item, { ...progress, solutionPenalty: true })).toBe(65);
  });
});
