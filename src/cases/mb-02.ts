import { defineCase } from "./schema";
export const mb02 = defineCase({
  id: "MB-02", app: "metabase", title: "Cuello de botella después del lead", difficulty: "Intermedio", problemType: "Operación",
  businessContext: "Las solicitudes llegan con normalidad y se convierten en proyectos. Sin embargo, el equipo comercial agenda menos visitas en el sector industrial y quiere saber dónde se interrumpe el seguimiento.",
  question: "¿Qué combinación de sector y fuente de agente frena las visitas solicitadas?",
  startRoute: "/metabase/dashboard/growth-full-picture?case=MB-02&datePreset=custom&from=2026-08-02&to=2026-09-30&comparison=Previous+period&sector=Naves+industriales&traffic=&cohort=",
  objectives: [
    { id: "sector", kind: "acknowledge", step: "Revisa el sector Naves industriales.", detector: { filters: { sector: "Naves industriales" } } },
    { id: "agent", kind: "action", step: "Aísla Agent Source = VIRTUAL.", detector: { filters: { sector: "Naves industriales", agentSource: "VIRTUAL" } } },
    { id: "cancel", kind: "action", step: "Filtra el estatus cancelled y observa los motivos.", detector: { filters: { sector: "Naves industriales", agentSource: "VIRTUAL", visitStatus: "cancelled" } } },
  ],
  hints: ["El problema aparece después de crear el proyecto, no antes.", "Cruza Sector con Agent Source y compara la tasa de request visits.", "En VIRTUAL aumentan los casos sin respuesta del cliente/inquilino."],
  quiz: [{ id: "cause", kind: "multiple", question: "¿Qué explica mejor el cuello de botella?", options: ["Cae la captación de leads en todos los sectores", "Los proyectos industriales de VIRTUAL no se agendan y crecen las cancelaciones por falta de respuesta", "La comisión de los contratos ganados bajó"], answer: 1, explanation: "Leads y proyectos siguen estables; el deterioro se produce en el agendamiento de visitas." }],
  solution: { diagnosis: "El problema está en el paso proyecto→solicitud de visita de Naves industriales atendidas por VIRTUAL.", evidence: "El CVR previo permanece estable, pero la tasa de visitas solicitadas cae al filtrar esa combinación y crece el motivo Sin respuesta del cliente/inquilino.", hypothesis: "El flujo automatizado no consigue confirmar disponibilidad o retomar al interesado a tiempo.", nextAction: "Auditar los tiempos de respuesta y derivar a un agente humano los proyectos industriales sin contacto confirmado.", monitor: "CVR proyectos→request visits y cancelaciones por falta de respuesta, por Agent Source." },
  relatedCases: ["MB-01", "CL-02"],
});
