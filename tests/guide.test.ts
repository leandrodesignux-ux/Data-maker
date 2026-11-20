import { describe, expect, it } from "vitest";
import { caseById } from "../src/cases/registry";
import { selectGuideStep } from "../src/cases/engine/guide";
import { guideStepSchema } from "../src/cases/schema";

const observation = (filters: Record<string, unknown> = {}) => ({ pathname: "/metabase/dashboard/growth-full-picture", query: new URLSearchParams(), filters });

describe("case guide", () => {
  it("requires stable data-guide targets", () => {
    expect(guideStepSchema.safeParse({ target: "#fragile", text: "Abre el filtro." }).success).toBe(false);
    expect(guideStepSchema.safeParse({ target: '[data-guide="mb-filter-traffic"]', text: "Abre el filtro." }).success).toBe(true);
    for (const definition of Object.values(caseById)) for (const objective of definition.objectives) {
      expect(objective.guide.length).toBeGreaterThan(0);
      for (const step of objective.guide) expect(step.target).toMatch(/^\[data-guide="[\w-]+"\]$/);
    }
  });

  it("advances from a chip through search to an option and returns when the popover closes", () => {
    const definition = caseById["MB-01"];
    const completed = ["paid"];
    const field = (value: string) => (target: string) => target.includes("pop-search") ? value : undefined;
    const select = (open: boolean, value = "") => selectGuideStep(definition, completed, observation({ traffic: "Paid" }), target => open && (target.includes("mb-pop-") || target.includes("mb-option-")), field(value));
    expect(select(false)?.step.target).toContain("mb-filter-campaign");
    expect(select(true)?.step.target).toContain("mb-pop-search");
    expect(select(true, "bodega")?.step.target).toContain("mb-option-campaign");
    expect(select(false, "bodega")?.step.target).toContain("mb-filter-campaign");
  });

  it("skips a completed objective and selects the next one", () => {
    const definition = caseById["MB-01"];
    const selected = selectGuideStep(definition, ["paid", "campaign"], observation({ traffic: "Paid", campaign: "Ruta Bodega Horizonte" }), () => false, () => undefined);
    expect(selected?.objective.id).toBe("organic");
    expect(selected?.step.target).toContain("mb-filter-clear-campaign");
  });
});
