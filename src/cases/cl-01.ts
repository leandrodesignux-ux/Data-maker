import { defineCase } from "./schema";
export const cl01 = defineCase({
  id: "CL-01", app: "clarity", title: "Clics fallidos en la galería", difficulty: "Inicial", problemType: "Experiencia",
  businessContext: "La tarjeta Ideas señala más clics fallidos en fichas. Las personas parecen interesadas en ver el inmueble, pero una parte de sus interacciones no produce respuesta visible.",
  question: "¿En qué elementos se concentran los clics fallidos y qué expectativa del usuario se incumple?",
  startRoute: "/clarity/panel?case=CL-01&url=%2Fspots%2F&urlOperator=contains&sector=Bodegas&datePreset=30d",
  objectives: [
    { id: "spot", step: "Filtra las fichas con URL visitada que contiene /spots/.", detector: { filters: { url: "/spots/" } } },
    { id: "map", step: "Abre el mapa térmico de Clic para la ficha.", detector: { path: "/clarity/mapas-termicos", filters: { mode: "click" } } },
    { id: "dead", step: "Muestra solo los clics fallidos y revisa la galería.", detector: { path: "/clarity/mapas-termicos", filters: { clickKind: "dead" } } },
  ],
  hints: ["Empieza en Ideas → Clics fallidos y limita las URL a fichas.", "En Mapas térmicos, el selector Mostrar separa todos los clics de los fallidos.", "La foto principal y las miniaturas acumulan intentos sin respuesta."],
  quiz: [
    { id: "cause", kind: "multiple", question: "¿Cuál es la fricción?", options: ["La galería parece interactiva pero no abre ni cambia la foto", "El precio de todas las fichas es incorrecto", "El usuario no llega a la ficha"], answer: 0, explanation: "Los clics fallidos se agrupan sobre la foto y las miniaturas." },
    { id: "rate", kind: "number", question: "¿Qué porcentaje aproximado de sesiones filtradas tiene clics fallidos?", answer: 10.5, tolerance: 5, unit: "%", explanation: "El segmento se sitúa alrededor del 10–13 %; el patrón por elemento explica la causa." },
  ],
  solution: { diagnosis: "La galería comunica una interacción que no responde a los clics en foto y miniaturas.", evidence: "Al filtrar fichas y clics fallidos, la lista de elementos y el calor se concentran en gallery-main y gallery-thumbnail.", hypothesis: "El control visual de galería quedó sin handler o su área clicable no coincide con lo que el usuario percibe.", nextAction: "Hacer funcional el cambio y ampliación de imagen, dar una señal de interacción clara y verificar con usuarios.", monitor: "Sesiones con clic fallido en elementos de galería y apertura efectiva de imágenes." },
  relatedCases: ["GA-01", "CL-02"],
});
