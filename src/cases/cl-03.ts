import { defineCase } from "./schema";
export const cl03 = defineCase({
  id: "CL-03", app: "clarity", title: "Clics continuos en el buscador", difficulty: "Avanzado", problemType: "Experiencia",
  businessContext: "Ideas muestra un aumento de clics continuos en móvil. El equipo sospecha una fricción de búsqueda, pero necesita localizar dispositivo, navegador y elemento antes de escalar un error.",
  question: "¿Dónde falla el autocompletado y cómo se relaciona con los errores JavaScript?",
  startRoute: "/clarity/panel?case=CL-03&sector=Locales+comerciales&device=mobile&page=%2F&datePreset=30d",
  objectives: [
    { id: "safari", step: "Filtra Explorador = Safari en móvil.", detector: { filters: { device: "mobile", browser: "Safari" } } },
    { id: "rage", step: "Abre el mapa de Clic y muestra solo clics continuos.", detector: { path: "/clarity/mapas-termicos", filters: { clickKind: "rage", browser: "Safari", device: "mobile" } } },
    { id: "errors", step: "Vuelve al Panel y contrasta la tarjeta Errores de JavaScript.", detector: { path: "/clarity/panel", filters: { behavior: "jsError", browser: "Safari", device: "mobile" } } },
  ],
  hints: ["Aísla móvil antes de mirar el mapa de calor.", "Filtra Safari y muestra únicamente clics continuos.", "El campo Buscar una ubicación concentra intentos repetidos y el mismo segmento tiene errores JS."],
  quiz: [
    { id: "cause", kind: "multiple", question: "¿Cuál es la hipótesis más sólida?", options: ["El autocompletado falla en Safari móvil y provoca intentos repetidos", "Todos los usuarios prefieren mapas", "El problema está en las miniaturas de fichas"], answer: 0, explanation: "El calor sobre location-search y la coincidencia con errores JS apuntan al autocompletado." },
    { id: "rageRate", kind: "number", question: "¿Qué porcentaje aproximado de sesiones Safari móvil tiene clics continuos?", answer: 20, tolerance: 9, unit: "%", explanation: "La tasa ronda el 20 % en el segmento de investigación." },
  ],
  solution: { diagnosis: "El autocompletado de ubicación falla en Safari móvil y genera clics repetidos.", evidence: "El filtro Safari+móvil eleva clics continuos y errores JS; el mapa de clics continuos señala el buscador de ubicación.", hypothesis: "Una incompatibilidad del componente de autocompletado en Safari/iOS deja el control sin respuesta.", nextAction: "Reproducir el error en Safari móvil, corregir el componente y probar teclado, sugerencias y selección de ubicación.", monitor: "Errores JS y sesiones con clics continuos sobre location-search por navegador/dispositivo." },
  relatedCases: ["GA-03", "CL-01"],
});
