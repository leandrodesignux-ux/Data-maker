"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import type { CaseDefinition } from "../schema";

export type CaseProgress = { startedAt: number; completedSteps: string[]; answers: Record<string, boolean>; revealedHints: number; hintPenalties: number; wrongAnswers: number; solutionRevealed: boolean; solutionPenalty: boolean; resolvedAt?: number };
export type CaseStatus = "nuevo" | "en curso" | "resuelto";
const fresh = (): CaseProgress => ({ startedAt: Date.now(), completedSteps: [], answers: {}, revealedHints: 0, hintPenalties: 0, wrongAnswers: 0, solutionRevealed: false, solutionPenalty: false });
export function caseStatus(progress?: CaseProgress): CaseStatus { return !progress ? "nuevo" : progress.resolvedAt ? "resuelto" : "en curso"; }
export function caseScore(definition: CaseDefinition, progress?: CaseProgress): number {
  if (!progress) return 0;
  const steps = progress.completedSteps.filter(id => definition.objectives.some(item => item.id === id)).length;
  const answers = definition.quiz.filter(item => progress.answers[item.id]).length;
  return Math.max(0, Math.round(60 * steps / definition.objectives.length + 40 * answers / definition.quiz.length - 10 * (progress.hintPenalties ?? 0) - 5 * progress.wrongAnswers - (progress.solutionPenalty ? 20 : 0)));
}
type ProgressState = {
  cases: Record<string, CaseProgress>;
  begin: (id: string) => void;
  mark: (id: string, stepId: string, definition: CaseDefinition) => void;
  answer: (id: string, quizId: string, correct: boolean, definition: CaseDefinition) => void;
  revealHint: (id: string, penalized: boolean) => void;
  revealSolution: (id: string) => void;
  reset: (id: string) => void;
};
function resolved(progress: CaseProgress, definition: CaseDefinition): CaseProgress {
  const allSteps = definition.objectives.every(item => progress.completedSteps.includes(item.id));
  const allAnswers = definition.quiz.every(item => progress.answers[item.id]);
  return allSteps && allAnswers ? { ...progress, solutionRevealed: true, resolvedAt: progress.resolvedAt ?? Date.now() } : progress;
}
export const useCaseProgress = create<ProgressState>()(persist((set) => ({
  cases: {},
  begin: id => set(state => state.cases[id] ? state : { cases: { ...state.cases, [id]: fresh() } }),
  mark: (id, stepId, definition) => set(state => {
    const old = state.cases[id] ?? fresh(); if (old.completedSteps.includes(stepId)) return state;
    return { cases: { ...state.cases, [id]: resolved({ ...old, completedSteps: [...old.completedSteps, stepId] }, definition) } };
  }),
  answer: (id, quizId, correct, definition) => set(state => {
    const old = state.cases[id] ?? fresh(); if (old.answers[quizId]) return state;
    const next = { ...old, answers: correct ? { ...old.answers, [quizId]: true } : old.answers, wrongAnswers: old.wrongAnswers + (correct ? 0 : 1) };
    return { cases: { ...state.cases, [id]: resolved(next, definition) } };
  }),
  revealHint: (id, penalized) => set(state => { const old = state.cases[id] ?? fresh(); if (old.revealedHints >= 3) return state; return { cases: { ...state.cases, [id]: { ...old, revealedHints: old.revealedHints + 1, hintPenalties: (old.hintPenalties ?? 0) + (penalized ? 1 : 0) } } }; }),
  revealSolution: id => set(state => { const old = state.cases[id] ?? fresh(); return { cases: { ...state.cases, [id]: { ...old, solutionRevealed: true, solutionPenalty: !old.resolvedAt } } }; }),
  reset: id => set(state => { const cases = { ...state.cases }; delete cases[id]; return { cases }; }),
}), { name: "data-maker-cases", version: 1 }));

export function useCasesHydrated() {
  return useSyncExternalStore(
    callback => useCaseProgress.persist.onFinishHydration(callback),
    () => useCaseProgress.persist.hasHydrated(),
    () => false,
  );
}
