"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CheckCircle2, CircleDashed, PlayCircle } from "lucide-react";
import { cases } from "@/cases/registry";
import { caseScore, caseStatus, useCaseProgress, useCasesHydrated } from "@/cases/engine/progress";
import "./cases-catalog.css";

const appNames = { metabase: "Metabase", ga4: "Google Analytics 4", clarity: "Microsoft Clarity" };
export function CasesCatalog() {
  const [app, setApp] = useState("all"), [difficulty, setDifficulty] = useState("all"), [problem, setProblem] = useState("all");
  const progress = useCaseProgress(state => state.cases);
  const hydrated = useCasesHydrated();
  const visible = useMemo(() => cases.filter(item => (app === "all" || item.app === app) && (difficulty === "all" || item.difficulty === difficulty) && (problem === "all" || item.problemType === problem)), [app, difficulty, problem]);
  const solved = cases.filter(item => progress[item.id]?.resolvedAt).length;
  return <main className="cases-page" data-hydrated={hydrated}><div className="cases-inner"><header className="cases-header"><Link href="/" className="cases-home"><div className="hub-mark">D<span>M</span></div><b>DATA MAKER</b></Link><Link href="/">Volver al inicio <ArrowUpRight size={16}/></Link></header>
    <section className="cases-hero"><p className="hub-eyebrow">MODO CASOS</p><h1>Aprende a encontrar<br/><em>la causa.</em></h1><p>Nueve investigaciones guiadas con un universo compartido de datos ficticios. Explora cada herramienta, reúne evidencia y explica tu diagnóstico.</p><div className="cases-summary"><strong>{hydrated ? solved : 0} de {cases.length}</strong><span>casos resueltos</span><div><i style={{ width: `${hydrated ? solved / cases.length * 100 : 0}%` }}/></div></div></section>
    <section className="cases-list-section"><div className="cases-list-title"><div><h2>Catálogo de casos</h2><span>{visible.length} ejercicios</span></div><div className="cases-filters"><label>Herramienta <select aria-label="Filtrar por app" value={app} onChange={event => setApp(event.target.value)}><option value="all">Todas</option><option value="metabase">Metabase</option><option value="ga4">GA4</option><option value="clarity">Clarity</option></select></label><label>Dificultad <select aria-label="Filtrar por dificultad" value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="all">Todas</option>{["Inicial", "Intermedio", "Avanzado"].map(value => <option key={value}>{value}</option>)}</select></label><label>Problema <select aria-label="Filtrar por problema" value={problem} onChange={event => setProblem(event.target.value)}><option value="all">Todos</option>{["Conversión", "Adquisición", "Medición", "Experiencia", "Operación"].map(value => <option key={value}>{value}</option>)}</select></label></div></div>
      <div className="cases-grid">{visible.map(item => { const current = hydrated ? progress[item.id] : undefined; const status = caseStatus(current), score = caseScore(item, current); const StatusIcon = status === "resuelto" ? CheckCircle2 : status === "en curso" ? CircleDashed : PlayCircle; return <Link key={item.id} href={`/casos/${item.id}`} className={`cases-card cases-card-${item.app}`} data-case-id={item.id}><div className="cases-card-top"><span className="cases-app">{appNames[item.app]}</span><span className={`cases-status status-${status.replace(" ", "-")}`}><StatusIcon size={14}/>{status}</span></div><div className="cases-id">{item.id} <span>· {item.difficulty} · {item.problemType}</span></div><h3>{item.title}</h3><p>{item.question}</p><div className="cases-card-footer"><span>{current ? `${current.completedSteps.length}/${item.objectives.length} pasos · ${score} pts` : `${item.objectives.length} pasos`}</span><strong>{status === "nuevo" ? "Comenzar" : "Continuar"} <ArrowRight size={16}/></strong></div></Link>; })}</div>
    </section><footer className="hub-footer">Data Maker <span>Simulador de entrenamiento · datos ficticios</span></footer></div></main>;
}
