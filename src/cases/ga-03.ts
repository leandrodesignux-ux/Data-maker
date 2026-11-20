import { defineCase } from "./schema";
export const ga03 = defineCase({
  id: "GA-03", app: "ga4", title: "Conversión rota por tracking", difficulty: "Avanzado", problemType: "Medición",
  businessContext: "Tras una publicación del producto, el evento de solicitud de WhatsApp cae de golpe. El equipo teme perder conversiones, pero la intención de hacer clic no muestra la misma caída.",
  question: "¿Se rompió la experiencia o el disparo del evento en un navegador concreto?",
  startRoute: "/ga4/informes/eventos?case=GA-03&datePreset=90d",
  objectives: [
    { id: "detail", kind: "action", step: "Abre el detalle de clientRequestedWhatsappForm.", detector: { path: "/ga4/informes/eventos/clientRequestedWhatsappForm" } },
    { id: "browser", kind: "action", step: "Selecciona Navegador en Parámetros del evento.", detector: { path: "/ga4/informes/eventos/clientRequestedWhatsappForm", filters: { secondary: "browser" } } },
    { id: "safari", kind: "action", step: "Filtra Safari para aislar el problema.", detector: { path: "/ga4/informes/eventos/clientRequestedWhatsappForm", includes: { conditions: "Safari" } } },
    { id: "ios", kind: "action", step: "Comprueba también el sistema operativo iOS.", detector: { path: "/ga4/informes/eventos/clientRequestedWhatsappForm", includes: { conditions: "iOS" } } },
  ],
  hints: ["Compara el clic de WhatsApp con la solicitud registrada.", "En el detalle añade Navegador y después Sistema operativo como dimensiones o filtros.", "La caída se concentra en Safari/iOS; el clic previo sigue normal."],
  quiz: [{ id: "cause", kind: "multiple", question: "¿Qué afirmación es la más prudente?", options: ["Todas las personas dejaron de querer contactar", "El evento de solicitud dejó de dispararse en Safari/iOS; hay que validar el flujo real", "El canal Paid Social desapareció"], answer: 1, explanation: "El evento anterior al request se mantiene, así que primero hay que auditar instrumentación y flujo en Safari/iOS." }],
  solution: { diagnosis: "El registro de clientRequestedWhatsappForm falla en Safari/iOS tras el release.", evidence: "La caída se concentra en ese navegador y sistema operativo mientras clientClickedWhatsappForm conserva volumen.", hypothesis: "Un cambio de front impide disparar el evento de solicitud en el flujo de Safari; aún debe verificarse si también afecta el envío real.", nextAction: "Reproducir el flujo en Safari/iOS, inspeccionar errores y corregir el disparo; contrastar con registros de WhatsApp antes de estimar pérdida comercial.", monitor: "Ratio requested/clicked de WhatsApp por navegador y sistema operativo." },
  relatedCases: ["CL-03", "MB-03"],
});
