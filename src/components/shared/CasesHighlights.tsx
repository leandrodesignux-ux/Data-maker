"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cases } from "@/cases/registry";
import { caseScore, caseStatus, useCaseProgress, useCasesHydrated } from "@/cases/engine/progress";
export function CasesHighlights() {
  const progress = useCaseProgress(state => state.cases);
  const hydrated = useCasesHydrated();
  const solved = hydrated ? cases.filter(item => progress[item.id]?.resolvedAt).length : 0;
  return <section className="hub-cases" aria-labelledby="cases-title"><div className="hub-cases-intro"><p className="hub-eyebrow">MODO CASOS</p><h2 id="cases-title">Investiga un caso</h2><p>{solved} de {cases.length} resueltos. Sigue pistas, comprueba hipótesis y explica tu diagnóstico.</p><div className="hub-featured">{[cases[0], cases[3], cases[6]].map(item => { const current = hydrated ? progress[item.id] : undefined; return <Link key={item.id} href={`/casos/${item.id}`}><span>{item.id} · {item.app === "ga4" ? "GA4" : item.app === "clarity" ? "Clarity" : "Metabase"}</span><strong>{item.title}</strong><small>{caseStatus(current)}{current ? ` · ${caseScore(item, current)} pts` : ""}</small><ArrowUpRight size={16}/></Link>; })}</div></div><Link className="hub-cases-all" href="/casos">Ver los nueve casos <ArrowUpRight size={16}/></Link></section>;
}
