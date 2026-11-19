import { CAMPAIGNS } from "../data/universe";
import { defineCase } from "./schema";
export const mb01 = defineCase({
  id: "MB-01", app: "metabase", title: "Mucho alcance, poca conversión", difficulty: "Inicial", problemType: "Conversión",
  businessContext: "El equipo de growth amplió la distribución de las Browse Pages. En cuatro semanas subieron los usuarios, pero los leads apenas se movieron. La dirección quiere saber si falló la página o cambió la calidad del tráfico.",
  question: "¿Qué segmento explica la caída de usuarios a leads y qué harías con la inversión?",
  startRoute: "/metabase/dashboard/growth-full-picture?case=MB-01&datePreset=custom&from=2026-09-03&to=2026-09-30&comparison=Previous+period&entryPoint=Browse+Page&traffic=",
  objectives: [
    { id: "paid", step: "Aísla el tráfico Paid con Traffic Type.", detector: { filters: { traffic: "Paid" } } },
    { id: "campaign", step: "Selecciona la campaña de bodegas en Campaign Name.", detector: { filters: { traffic: "Paid", campaign: CAMPAIGNS.bodegasDiscovery } } },
    { id: "organic", step: "Limpia la campaña y compara con Traffic Type = Organic.", detector: { filters: { traffic: "Organic", campaign: "" } } },
  ],
  hints: ["Separa los usuarios nuevos por tipo de tráfico antes de juzgar la página.", "Busca una campaña con mucho alcance y pocos leads.", "La campaña ficticia Ruta Bodega Horizonte concentra la pérdida de intención; orgánico sirve como control."],
  quiz: [
    { id: "cause", kind: "multiple", question: "¿Cuál es la explicación mejor respaldada?", options: ["El formulario dejó de registrar leads en todos los canales", "La campaña de bodegas atrae usuarios de baja intención", "La oferta de bodegas desapareció"], answer: 1, explanation: "La caída se concentra en una campaña Paid; el tráfico orgánico conserva una conversión más estable." },
    { id: "cvr", kind: "number", question: "¿Cuántos puntos porcentuales cae aproximadamente el CVR usuarios→leads frente al periodo anterior?", answer: 1.6, tolerance: 1, unit: "p. p.", explanation: "La diferencia entre el CVR actual y el anterior ronda 1,6 puntos; después hay que localizar qué campaña la explica." },
  ],
  solution: { diagnosis: "El crecimiento de alcance viene de tráfico pagado de baja intención y diluye el CVR usuarios→leads.", evidence: "Al separar Paid y la campaña Ruta Bodega Horizonte, el volumen crece más que los leads. Organic Search mantiene una conversión relativamente estable.", hypothesis: "La promesa o segmentación de la campaña alcanza personas que aún no buscan rentar una bodega.", nextAction: "Revisar audiencia, términos y mensaje de la campaña; reducir inversión en el segmento débil y probar una landing con intención explícita.", monitor: "CVR usuarios→leads y costo por lead cualificado por campaña, comparados con orgánico." },
  relatedCases: ["GA-02", "MB-02"],
});
