import { CAMPAIGNS } from "../data/universe";
import { defineCase } from "./schema";
export const ga02 = defineCase({
  id: "GA-02", app: "ga4", title: "Canal con volumen y sin intención", difficulty: "Inicial", problemType: "Adquisición",
  businessContext: "Las sesiones crecen con fuerza mes contra mes. El equipo de adquisición necesita saber si ese crecimiento trajo usuarios interesados o solo alcance de una campaña de awareness.",
  question: "¿Qué canal y campaña explican el aumento sin interacción útil?",
  startRoute: "/ga4/informes/adquisicion-trafico?case=GA-02&datePreset=month&comparePeriod=true&dimension=channel",
  objectives: [
    { id: "traffic", step: "Abre Adquisición de tráfico y compara con el periodo anterior.", detector: { path: "/ga4/informes/adquisicion-trafico", filters: { comparePeriod: true } } },
    { id: "campaign", step: "Cambia la dimensión principal a Campaña de la sesión.", detector: { path: "/ga4/informes/adquisicion-trafico", filters: { dimension: "campaign" } } },
    { id: "social", step: "Filtra Paid Social para contrastar su calidad.", detector: { path: "/ga4/informes/adquisicion-trafico", includes: { conditions: "Paid Social" } } },
  ],
  hints: ["El total de sesiones no indica intención.", "Cambia de grupo de canales a campaña y revisa tasa de interacción y tiempo.", `La campaña ficticia ${CAMPAIGNS.socialAwareness} concentra sesiones cortas de Paid Social.`],
  quiz: [
    { id: "cause", kind: "multiple", question: "¿Qué decisión respalda el informe?", options: ["Celebrar el volumen como conversión", "Revisar la campaña de awareness antes de ampliar inversión", "Desactivar todos los canales orgánicos"], answer: 1, explanation: "El tráfico nuevo casi no interactúa ni genera eventos clave." },
    { id: "engagement", kind: "number", question: "¿Qué tasa de interacción aproximada tiene el segmento débil?", answer: 18, tolerance: 8, unit: "%", explanation: "La interacción es baja, aproximadamente una quinta parte de las sesiones." },
  ],
  solution: { diagnosis: "El crecimiento procede de Paid Social, sobre todo de una campaña de awareness de baja intención.", evidence: "La dimensión de campaña concentra el incremento; el segmento muestra interacción baja, sesiones breves y casi ningún evento clave.", hypothesis: "El mensaje maximiza curiosidad y alcance, pero no coincide con una búsqueda activa de inmueble.", nextAction: "Separar objetivos de awareness y captación, ajustar audiencias y creatividad, y limitar inversión hasta mejorar la calidad.", monitor: "Tasa de interacción, tiempo activo y eventos clave por campaña, además de costo por lead." },
  relatedCases: ["MB-01", "GA-01"],
});
