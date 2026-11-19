import type { CaseDetector } from "../schema";

export type CaseObservation = { pathname: string; query: URLSearchParams; filters: Record<string, unknown> };
export function detectStep(detector: CaseDetector, observation: CaseObservation): boolean {
  if (detector.path && !observation.pathname.startsWith(detector.path)) return false;
  if (detector.filters && Object.entries(detector.filters).some(([key, expected]) => observation.filters[key] !== expected)) return false;
  if (detector.query && Object.entries(detector.query).some(([key, expected]) => observation.query.get(key) !== String(expected))) return false;
  if (detector.includes && Object.entries(detector.includes).some(([key, expected]) => !String(observation.filters[key] ?? observation.query.get(key) ?? "").includes(expected))) return false;
  return true;
}
