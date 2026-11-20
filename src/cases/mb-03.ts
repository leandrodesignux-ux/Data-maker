import { defineCase } from "./schema";
export const mb03 = defineCase({
  id: "MB-03", app: "metabase", title: "La caída que no es caída", difficulty: "Avanzado", problemType: "Medición",
  businessContext: "El tablero muestra un descenso brusco de usuarios a partir de una semana. Los leads no acompañan esa caída y el bounce rate mejora. Antes de activar un plan de recuperación, hay que comprobar qué cambió en la medición.",
  question: "¿Se perdió demanda real o cambió la clasificación de sesiones sospechosas?",
  startRoute: "/metabase/dashboard/growth-full-picture?case=MB-03&datePreset=custom&from=2026-08-12&to=2026-09-08&comparison=Previous+period&sector=Locales+comerciales&channel=Direct&entryPoint=Home&traffic=&cohort=",
  objectives: [
    { id: "all", kind: "action", step: "Incluye todos los usuarios en User Sospechoso.", detector: { filters: { suspicious: "All" } } },
    { id: "bots", kind: "action", step: "Aísla los usuarios sospechosos (1).", detector: { filters: { suspicious: "1" } } },
    { id: "clean", kind: "action", step: "Excluye todos los bots y revisa la serie limpia.", detector: { filters: { suspicious: "excludeAll" } } },
  ],
  hints: ["Cuando usuarios caen pero leads se mantienen, cuestiona el denominador.", "Compara la serie con User Sospechoso = All y con sospechosos aislados.", "La clasificación reciente retira bots de la cuenta visible; la demanda humana no cae igual."],
  quiz: [{ id: "cause", kind: "multiple", question: "¿Cómo comunicarías el hallazgo?", options: ["La demanda cayó en la misma proporción que los usuarios", "La serie cambió por clasificación de bots; no hay evidencia de una caída equivalente de negocio", "El formulario duplicó leads"], answer: 1, explanation: "La discrepancia entre usuarios, leads y bounce rate señala un cambio de medición." }],
  solution: { diagnosis: "La caída aparente de usuarios se debe principalmente a una nueva clasificación de bots.", evidence: "Al incluir sospechosos reaparece volumen; al aislarlos se ve el segmento que desapareció de la serie principal. Leads y rebote mejorado no respaldan una pérdida equivalente de demanda.", hypothesis: "La instrumentación empezó a identificar tráfico automatizado que antes se contaba como usuario normal.", nextAction: "Anotar el cambio de definición en el tablero y reconstruir una serie histórica comparable de tráfico humano.", monitor: "Usuarios y leads humanos, junto con porcentaje de sesiones clasificadas como bots." },
  relatedCases: ["GA-03", "MB-01"],
});
