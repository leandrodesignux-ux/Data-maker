import { hasEvent, isEngaged, isVisibleUser, stageAtLeast } from "../generator";
import type { CrmRecord, Dataset, ScenarioId, Session } from "../model";
import { ratio } from "./types";

export function cohort(dataset: Dataset, id: ScenarioId, from = 0, to = 180): Session[] {
  return dataset.sessions.filter(s => s.scenarioKey === id && dayNumber(s) >= from && dayNumber(s) < to);
}
export function crmCohort(dataset: Dataset, id: ScenarioId, from = 0, to = 180): CrmRecord[] {
  return dataset.crm.filter(r => r.scenarioKey === id && dayNumber(r) >= from && dayNumber(r) < to);
}
export function dayNumber(item: { day: string }): number {
  return Math.round((Date.parse(`${item.day}T12:00:00Z`) - Date.parse("2026-04-04T12:00:00Z")) / 86_400_000);
}
export function eventRate(sessions: readonly Session[], name: Parameters<typeof hasEvent>[1]): number { return ratio(sessions.filter(s => hasEvent(s, name)).length, sessions.length); }
export function cvr(sessions: readonly Session[], event: Parameters<typeof hasEvent>[1]): number {
  return ratio(sessions.filter(s => hasEvent(s, event)).length, new Set(sessions.map(s => s.userId)).size);
}
export function stageRate(records: readonly CrmRecord[], from: Parameters<typeof stageAtLeast>[1], to: Parameters<typeof stageAtLeast>[1]): number {
  const eligible = records.filter(r => stageAtLeast(r, from));
  return ratio(eligible.filter(r => stageAtLeast(r, to)).length, eligible.length);
}
export function engagedRate(sessions: readonly Session[]): number { return ratio(sessions.filter(isEngaged).length, sessions.length); }
export function visibleUsers(sessions: readonly Session[]): number { return new Set(sessions.filter(isVisibleUser).map(s => s.userId)).size; }
export function avg(sessions: readonly Session[], select: (session: Session) => number): number { return ratio(sessions.reduce((sum, session) => sum + select(session), 0), sessions.length); }
