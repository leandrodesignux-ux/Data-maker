import type { CaseDefinition } from "../schema";
import { detectStep, type CaseObservation } from "./detectors";

type GuideStep = CaseDefinition["objectives"][number]["guide"][number];
export type GuideSelection = { objectiveIndex: number; stepIndex: number; objective: CaseDefinition["objectives"][number]; step: GuideStep };

export function selectGuideStep(
  definition: CaseDefinition,
  completed: readonly string[],
  observation: CaseObservation,
  isVisible: (target: string) => boolean,
  fieldValue: (target: string) => string | undefined,
  requestedId?: string,
): GuideSelection | null {
  const objectiveIndex = requestedId
    ? definition.objectives.findIndex(item => item.id === requestedId && !completed.includes(item.id))
    : definition.objectives.findIndex(item => !completed.includes(item.id));
  if (objectiveIndex < 0) return null;
  const objective = definition.objectives[objectiveIndex];
  const pending = objective.guide.map((step, index) => ({ step, index })).filter(({ step }) => {
    if (step.doneWhen && detectStep(step.doneWhen, observation)) return false;
    if (step.value !== undefined && fieldValue(step.target)?.toLowerCase().includes(step.value.toLowerCase())) return false;
    return true;
  });
  if (!pending.length) return { objectiveIndex, stepIndex: objective.guide.length - 1, objective, step: objective.guide.at(-1)! };
  let current = pending[0];
  for (const next of pending.slice(1)) {
    if (!next.step.afterOpen || !isVisible(next.step.target)) break;
    if (current.step.value !== undefined) break;
    current = next;
  }
  return { objectiveIndex, stepIndex: current.index, objective, step: current.step };
}
