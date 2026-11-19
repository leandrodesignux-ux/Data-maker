import type { Dataset, ScenarioId } from "../model";

export interface NumericAssertion { name: string; actual: number; operator: "<" | "<=" | ">" | ">="; expected: number; passed: boolean }
export interface Scenario { id: ScenarioId; apply: (dataset: Dataset) => void; assertions: (dataset: Dataset) => NumericAssertion[] }
export function check(name: string, actual: number, operator: NumericAssertion["operator"], expected: number): NumericAssertion {
  const passed = operator === "<" ? actual < expected : operator === "<=" ? actual <= expected : operator === ">" ? actual > expected : actual >= expected;
  return { name, actual, operator, expected, passed };
}
export function ratio(numerator: number, denominator: number): number { return denominator ? numerator / denominator : 0; }
