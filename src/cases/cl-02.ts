import { defineCase } from "./schema";
export const cl02 = defineCase({
  id: "CL-02", app: "clarity", title: "El contacto queda fuera de vista", difficulty: "Intermedio", problemType: "Conversión",
  businessContext: "GA4 muestra que la ficha convierte peor en escritorio. En Clarity, la profundidad de desplazamiento sugiere que el bloque de contacto podría quedar fuera del recorrido habitual.",
  question: "¿Cuánta gente llega al contacto en PC y qué cambia frente a móvil?",
  startRoute: "/clarity/panel?case=CL-02&sector=Oficinas&channel=Organic+Search&url=%2Fspots%2F&device=desktop&datePreset=30d",
  objectives: [
    { id: "desktop", kind: "acknowledge", step: "Revisa fichas de oficina en PC.", detector: { filters: { sector: "Oficinas", device: "desktop", url: "/spots/" } } },
    { id: "scroll", kind: "action", step: "Abre Mapas térmicos → Desplazamiento.", detector: { path: "/clarity/mapas-termicos", filters: { mode: "scroll" } } },
    { id: "compare", kind: "action", step: "Activa Comparar y selecciona Móvil.", detector: { path: "/clarity/mapas-termicos", filters: { mode: "scroll", compare: true, compareDevice: "mobile" } } },
  ],
  hints: ["El bloque de contacto está después de una descripción larga.", "Usa Desplazamiento y mira el alcance cercano al 75 % de la página.", "Compara PC con móvil; el contacto desktop no permanece visible durante la lectura."],
  quiz: [
    { id: "cause", kind: "multiple", question: "¿Qué cambio probarías primero?", options: ["Ocultar el formulario en PC", "Hacer visible el contacto en PC durante la lectura", "Eliminar la comparación por dispositivo"], answer: 1, explanation: "El problema es de visibilidad; un contacto accesible puede reducir la fricción." },
    { id: "reach", kind: "number", question: "¿Qué porcentaje aproximado de sesiones PC alcanza el 75 % de la ficha?", answer: 23, tolerance: 9, unit: "%", explanation: "El alcance desktop ronda una cuarta parte, por debajo del móvil en el segmento comparable." },
  ],
  solution: { diagnosis: "En escritorio, el contacto no es sticky y aparece después de una descripción extensa; gran parte de las sesiones no llega a verlo.", evidence: "En el segmento de oficinas, cerca de una cuarta parte de PC llega al 75 % de la ficha. La comparación móvil muestra mejor alcance y GA-01 muestra peor CVR desktop.", hypothesis: "La posición del formulario, más que la falta de interés, explica parte de la pérdida entre ficha y contacto.", nextAction: "Probar un panel de contacto fijo o un acceso persistente en PC sin tapar contenido, y validar su efecto experimentalmente.", monitor: "Alcance del contacto y CVR ficha→abre contacto por dispositivo." },
  relatedCases: ["GA-01", "CL-01"],
});
