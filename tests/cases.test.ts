import { describe, expect, it } from "vitest";
import { cases, caseById } from "../src/cases/registry";
import { caseSchema } from "../src/cases/schema";
import { detectStep } from "../src/cases/engine/detectors";
import { caseScore, caseStatus, type CaseProgress } from "../src/cases/engine/progress";

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
  it("scores completed work and penalizes premature hints and wrong answers", () => {
    const item = caseById["CL-01"];
    const progress: CaseProgress = { startedAt: 1, completedSteps: item.objectives.map(step => step.id), answers: Object.fromEntries(item.quiz.map(q => [q.id, true])), revealedHints: 1, hintPenalties: 1, wrongAnswers: 1, solutionRevealed: true, solutionPenalty: false, resolvedAt: 2 };
    expect(caseStatus(progress)).toBe("resuelto");
    expect(caseScore(item, progress)).toBe(85);
    expect(caseScore(item, { ...progress, solutionPenalty: true })).toBe(65);
  });
});
