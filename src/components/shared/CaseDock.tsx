"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, CircleHelp, Flag, Lightbulb, RotateCcw, Trophy } from "lucide-react";
import { useMetabaseStore } from "@/apps/metabase/store";
import { useGa4Store } from "@/apps/ga4/store";
import { useClarityStore } from "@/apps/clarity/store";
import { caseById } from "@/cases/registry";
import { detectStep } from "@/cases/engine/detectors";
import { caseScore, useCaseProgress } from "@/cases/engine/progress";
import type { CaseDefinition } from "@/cases/schema";
import { GuideSpotlight } from "./GuideSpotlight";
import "./case-dock.css";

function QuizItem({ definition, item }: { definition: CaseDefinition; item: CaseDefinition["quiz"][number] }) {
  const progress = useCaseProgress(state => state.cases[definition.id]);
  const answer = useCaseProgress(state => state.answer);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const solved = !!progress?.answers[item.id];
  const submit = () => {
    const numeric = Number(value.replace(",", "."));
    const correct = item.kind === "multiple" ? Number(value) === item.answer : value.trim() !== "" && Number.isFinite(numeric) && Math.abs(numeric - item.answer) <= item.tolerance;
    answer(definition.id, item.id, correct, definition);
    setFeedback(correct ? item.explanation : "Todavía no. Revisa la evidencia y vuelve a intentarlo (−5 puntos).");
  };
  return <div className={`case-quiz-item ${solved ? "solved" : ""}`} data-quiz-id={item.id}><p>{item.question}</p>{item.kind === "multiple" ? <div className="case-options">{item.options.map((option, index) => <label key={option}><input type="radio" name={`${definition.id}-${item.id}`} value={index} checked={value === String(index)} disabled={solved} onChange={() => setValue(String(index))}/>{option}</label>)}</div> : <label className="case-number">Respuesta <input type="text" inputMode="decimal" value={value} disabled={solved} onChange={event => setValue(event.target.value)} aria-label={item.question}/>{item.unit}</label>}{!solved && <button className="case-action" disabled={value === ""} onClick={submit}>Comprobar</button>}{feedback && <small role="status">{feedback}</small>}</div>;
}

export function CaseDock() {
  const pathname = usePathname(), params = useSearchParams();
  const caseId = params.get("case")?.toUpperCase() ?? "";
  const definition = caseById[caseId];
  const mb = useMetabaseStore(state => state.filters), ga = useGa4Store(state => state.filters), cl = useClarityStore(state => state.filters);
  const cases = useCaseProgress(state => state.cases), begin = useCaseProgress(state => state.begin), mark = useCaseProgress(state => state.mark);
  const revealHint = useCaseProgress(state => state.revealHint), revealSolution = useCaseProgress(state => state.revealSolution), reset = useCaseProgress(state => state.reset);
  const [collapsed, setCollapsed] = useState(false), [autoCollapsed, setAutoCollapsed] = useState(false), [guideOverlap, setGuideOverlap] = useState(false), [now, setNow] = useState(0);
  const [guided, setGuided] = useState(() => typeof window === "undefined" || localStorage.getItem("data-maker-guided") !== "false");
  const [request, setRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [evidence, setEvidence] = useState<{ objectiveId: string; target: string; text: string } | null>(null);
  const dockRef = useRef<HTMLElement | null>(null), expandedRect = useRef<DOMRect | null>(null);
  const seenCompleted = useRef<{ caseId: string; ids: string[] } | null>(null);
  const progress = cases[caseId];
  const filters = definition?.app === "metabase" ? mb : definition?.app === "ga4" ? ga : cl;
  const observation = useMemo(() => {
    const query = new URLSearchParams(params.toString());
    const state = { ...filters } as Record<string, unknown>;
    for (const key of Object.keys(state)) if (query.has(key)) {
      const raw = query.get(key) ?? "";
      state[key] = typeof state[key] === "boolean" ? raw === "true" : typeof state[key] === "number" ? Number(raw) : raw;
    }
    return { pathname, query, filters: state };
  }, [pathname, params, filters]);
  useEffect(() => {
    if (!definition) return;
    begin(definition.id);
    for (const item of definition.objectives) {
      if (item.kind !== "action" || !detectStep(item.detector, observation)) continue;
      if (definition.app === "clarity" && item.guide.some(step => step.target === '[data-guide="cl-filters-apply"]') && document.querySelector(".cl-filter-drawer")) continue;
      mark(definition.id, item.id, definition);
    }
  }, [definition, observation, begin, mark, now]);
  useEffect(() => {
    if (!definition) return;
    const current = progress?.completedSteps ?? [];
    if (!seenCompleted.current || seenCompleted.current.caseId !== definition.id) { seenCompleted.current = { caseId: definition.id, ids: current }; return; }
    const previous = seenCompleted.current.ids;
    seenCompleted.current = { caseId: definition.id, ids: current };
    const newId = current.find(id => !previous.includes(id));
    const detail = definition.objectives.find(item => item.id === newId)?.evidence;
    if (newId && detail) setEvidence({ objectiveId: newId, ...detail });
    if (request && current.includes(request.id)) setRequest(null);
  }, [definition, progress?.completedSteps, request]);
  useEffect(() => {
    if (!evidence) return;
    const timer = window.setTimeout(() => setEvidence(null), 4500);
    return () => window.clearTimeout(timer);
  }, [evidence]);
  useEffect(() => { localStorage.setItem("data-maker-guided", String(guided)); }, [guided]);
  const onGuideGeometry = useCallback((target: DOMRect | null, bubble: { left: number; top: number; width: number; height: number } | null) => {
    const dock = expandedRect.current ?? dockRef.current?.getBoundingClientRect();
    if (!dock || (!target && !bubble)) { setGuideOverlap(false); return; }
    const overlaps = (other: { left: number; top: number; width: number; height: number } | null) => !!other && other.left < dock.right && other.left + other.width > dock.left && other.top < dock.bottom && other.top + other.height > dock.top;
    setGuideOverlap(value => { const next = overlaps(target) || overlaps(bubble); return value === next ? value : next; });
  }, []);
  useEffect(() => {
    if (!definition) return;
    const checkOverlap = () => {
      const dock = dockRef.current;
      if (!dock) return;
      if (!collapsed && !autoCollapsed && !guideOverlap) expandedRect.current = dock.getBoundingClientRect();
      const rect = expandedRect.current;
      if (!rect) return;
      const overlays = document.querySelectorAll<HTMLElement>('[data-radix-popper-content-wrapper], .cl-filter-drawer, .cl-save-dialog, .ga-filter-dialog, .mb-modal, .ga-editor-overlay');
      const overlaps = Array.from(overlays).some(node => {
        const other = node.getBoundingClientRect();
        return other.width > 0 && other.height > 0 && other.left < rect.right && other.right > rect.left && other.top < rect.bottom && other.bottom > rect.top;
      });
      setAutoCollapsed(value => value === overlaps ? value : overlaps);
    };
    const timer = window.setInterval(checkOverlap, 180);
    checkOverlap();
    return () => window.clearInterval(timer);
  }, [definition, collapsed, autoCollapsed, guideOverlap]);
  useEffect(() => { if (!definition) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [definition]);
  if (!definition || !pathname.startsWith(`/${definition.app}/`)) return null;
  const count = progress?.completedSteps.length ?? 0, total = definition.objectives.length;
  const nextHint = progress?.revealedHints ?? 0;
  const seconds = progress ? Math.max(0, Math.floor(((now || progress.startedAt) - progress.startedAt) / 1000)) : 0;
  const freeHint = seconds >= (nextHint + 1) * 60;
  const isCollapsed = collapsed || autoCollapsed || guideOverlap;
  return <><GuideSpotlight definition={definition} observation={observation} completed={progress?.completedSteps ?? []} enabled={guided} request={request} evidence={evidence} onAcknowledge={id => mark(definition.id, id, definition)} onNextEvidence={() => setEvidence(null)} onGeometry={onGuideGeometry}/><aside ref={dockRef} className={`case-dock ${isCollapsed ? "is-collapsed" : ""}`} aria-label={`Misión ${definition.id}`}>
    <div className="case-dock-head"><span><Flag size={16}/> MISIÓN {definition.id}</span><label className="case-guide-toggle"><input type="checkbox" checked={guided} onChange={event => setGuided(event.target.checked)}/>Modo guiado</label><button aria-label={isCollapsed ? "Expandir misión" : "Contraer misión"} onClick={() => setCollapsed(autoCollapsed ? false : !collapsed)}>{isCollapsed ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button></div>
    {isCollapsed ? <button className="case-dock-summary" onClick={() => setCollapsed(false)}>{definition.title} · {count}/{total} pasos</button> : <div className="case-dock-scroll">
      <div className="case-dock-intro"><div className="case-dock-meta"><span>{definition.difficulty}</span><span>{definition.problemType}</span><strong><Trophy size={14}/>{caseScore(definition, progress)} pts</strong></div><h2>{definition.title}</h2><p>{definition.businessContext}</p><strong className="case-question">{definition.question}</strong></div>
      <section><div className="case-section-title"><h3>Investiga</h3><span>{count}/{total}</span></div><ol className="case-steps">{definition.objectives.map(item => <li key={item.id} data-step-id={item.id} data-complete={!!progress?.completedSteps.includes(item.id)}><span className="case-step-check">{progress?.completedSteps.includes(item.id) && <Check size={13}/>}</span><span>{item.step}{!progress?.completedSteps.includes(item.id) && <button className="case-show-where" onClick={() => setRequest(old => ({ id: item.id, nonce: (old?.nonce ?? 0) + 1 }))}>Muéstrame dónde</button>}{item.kind === "acknowledge" && !progress?.completedSteps.includes(item.id) && <button className="case-acknowledge" onClick={() => mark(definition.id, item.id, definition)}>Entendido</button>}</span></li>)}</ol></section>
      <section><div className="case-section-title"><h3><Lightbulb size={16}/> Pistas</h3><span>{nextHint}/3</span></div>{definition.hints.slice(0, nextHint).map((hint, index) => <p className="case-hint" key={index}><b>{index + 1}.</b> {hint}</p>)}{nextHint < 3 && <button className="case-subtle-button" onClick={() => revealHint(definition.id, !freeHint)}>Mostrar pista {freeHint ? "(gratis)" : `(−10 pts; gratis en ${Math.max(0, (nextHint + 1) * 60 - seconds)} s)`}</button>}</section>
      <section><div className="case-section-title"><h3><CircleHelp size={16}/> Diagnóstico</h3></div>{definition.quiz.map(item => <QuizItem key={item.id} definition={definition} item={item}/>)}</section>
      <section><div className="case-section-title"><h3>Solución</h3></div>{progress?.solutionRevealed ? <div className="case-solution"><p><b>Diagnóstico.</b> {definition.solution.diagnosis}</p><p><b>Evidencia.</b> {definition.solution.evidence}</p><p><b>Hipótesis.</b> {definition.solution.hypothesis}</p><p><b>Siguiente acción.</b> {definition.solution.nextAction}</p><p><b>Métrica a monitorear.</b> {definition.solution.monitor}</p></div> : <button className="case-subtle-button" onClick={() => revealSolution(definition.id)}>Revelar solución antes de resolver (−20 pts)</button>}</section>
      <section><div className="case-section-title"><h3>Casos relacionados</h3></div><div className="case-related">{definition.relatedCases.map(id => <Link key={id} href={`/casos/${id}`}>{id} · {caseById[id]?.title}</Link>)}</div></section>
      <div className="case-dock-footer"><Link href="/casos">Volver al catálogo</Link><button onClick={() => { if (window.confirm("¿Reiniciar el progreso de este caso?")) reset(definition.id); }}><RotateCcw size={14}/> Reiniciar</button></div>
    </div>}
  </aside></>;
}
