import { defineCase } from "./schema";
export const ga01 = defineCase({
  id: "GA-01", app: "ga4", title: "La ficha no convierte en desktop", difficulty: "Intermedio", problemType: "Conversión",
  businessContext: "El embudo de las Browse Pages recibe visitas a las fichas, pero pocas personas abren el contacto. El promedio mezcla experiencias de móvil y escritorio y puede ocultar una fricción específica.",
  question: "¿En qué dispositivo se pierde la intención entre ficha y contacto?",
  startRoute: "/ga4/explorar/embudo?case=GA-01&datePreset=90d&conditions=%5B%7B%22dimension%22%3A%22channel%22%2C%22operator%22%3A%22equals%22%2C%22value%22%3A%22Organic%20Search%22%7D%2C%7B%22dimension%22%3A%22sector%22%2C%22operator%22%3A%22equals%22%2C%22value%22%3A%22Oficinas%22%7D%2C%7B%22dimension%22%3A%22entryPoint%22%2C%22operator%22%3A%22equals%22%2C%22value%22%3A%22Browse%20Page%22%7D%5D",
  objectives: [
    { id: "funnel", kind: "acknowledge", guide: [{"target":"[data-guide=\"ga-funnel-chart\"]","text":"Mira el paso de ficha a contacto. Después pulsa Entendido."}], evidence: {"target":"[data-guide=\"ga-explore-filters\"]","text":"Estos filtros delimitan el segmento del caso."}, step: "Abre Exploración de embudo y revisa ficha→contacto.", detector: { path: "/ga4/explorar/embudo" } },
    { id: "device", kind: "action", guide: [{"target":"[data-guide=\"ga-explore-breakdown\"]","text":"En Desglose, elige Categoría de dispositivo.","value":"device"}], evidence: {"target":"[data-guide=\"ga-funnel-table\"]","text":"Compara los pasos de PC y móvil en la tabla."}, step: "Elige Categoría de dispositivo como desglose.", detector: { path: "/ga4/explorar/embudo", query: { breakdown: "device" } } },
  ],
  hints: ["El total combina experiencias muy distintas.", "En Configuración cambia DESGLOSE a Categoría de dispositivo.", "Compara la salida de ficha en PC con la de móvil y relaciona el resultado con CL-02."],
  quiz: [
    { id: "cause", kind: "multiple", question: "¿Dónde está la fricción principal?", options: ["En la llegada a Browse Pages", "En el paso ficha→contacto de desktop", "En el registro de todos los eventos de móvil"], answer: 1, explanation: "El desglose muestra una caída mucho mayor en desktop tras entrar a la ficha." },
    { id: "desktop", kind: "number", question: "¿Qué CVR aproximado ficha→contacto observas en desktop?", answer: 1.5, tolerance: 2, unit: "%", explanation: "La tasa desktop ronda el 1–2 %, muy por debajo de móvil." },
  ],
  solution: { diagnosis: "La ficha pierde intención en desktop antes de abrir el contacto.", evidence: "El embudo global parece moderado, pero el desglose por dispositivo muestra un CVR desktop muy inferior al móvil.", hypothesis: "El bloque de contacto queda fuera de vista en una ficha extensa; Clarity permite contrastar la profundidad de scroll.", nextAction: "Probar un contacto visible durante la lectura en PC y medir su efecto con un experimento.", monitor: "CVR ficha→abre contacto por dispositivo y profundidad hasta el panel de contacto." },
  relatedCases: ["CL-02", "CL-01"],
});
