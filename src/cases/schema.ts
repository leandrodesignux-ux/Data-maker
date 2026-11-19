import { z } from "zod";

const scalar = z.union([z.string(), z.number(), z.boolean()]);
export const detectorSchema = z.object({
  path: z.string().startsWith("/").optional(),
  filters: z.record(z.string(), scalar).optional(),
  query: z.record(z.string(), scalar).optional(),
  includes: z.record(z.string(), z.string()).optional(),
}).refine(value => value.path || value.filters || value.query || value.includes, "El detector necesita una condición");
export const objectiveSchema = z.object({ id: z.string().min(1), step: z.string().min(1), detector: detectorSchema });
export const quizSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string().min(1), kind: z.literal("multiple"), question: z.string().min(1), options: z.array(z.string()).min(2), answer: z.number().int().nonnegative(), explanation: z.string().min(1) }).refine(q => q.answer < q.options.length),
  z.object({ id: z.string().min(1), kind: z.literal("number"), question: z.string().min(1), answer: z.number(), tolerance: z.number().nonnegative(), unit: z.string().optional(), explanation: z.string().min(1) }),
]);
export const caseSchema = z.object({
  id: z.string().regex(/^(MB|GA|CL)-0[1-3]$/), app: z.enum(["metabase", "ga4", "clarity"]),
  title: z.string().min(1), difficulty: z.enum(["Inicial", "Intermedio", "Avanzado"]),
  problemType: z.enum(["Conversión", "Adquisición", "Medición", "Experiencia", "Operación"]),
  businessContext: z.string().min(1), question: z.string().min(1), startRoute: z.string().startsWith("/"),
  objectives: z.array(objectiveSchema).min(2), hints: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  quiz: z.array(quizSchema).min(1),
  solution: z.object({ diagnosis: z.string().min(1), evidence: z.string().min(1), hypothesis: z.string().min(1), nextAction: z.string().min(1), monitor: z.string().min(1) }),
  relatedCases: z.array(z.string()),
}).superRefine((value, ctx) => {
  const prefix = value.app === "metabase" ? "MB" : value.app === "ga4" ? "GA" : "CL";
  if (!value.id.startsWith(prefix)) ctx.addIssue({ code: "custom", path: ["id"], message: "El ID debe coincidir con la app" });
  if (!value.startRoute.startsWith(`/${value.app}/`)) ctx.addIssue({ code: "custom", path: ["startRoute"], message: "La ruta inicial debe pertenecer a la app" });
  if (new URL(value.startRoute, "https://data-maker.invalid").searchParams.get("case") !== value.id) ctx.addIssue({ code: "custom", path: ["startRoute"], message: "La ruta inicial debe incluir el ID del caso" });
  if (new Set(value.objectives.map(item => item.id)).size !== value.objectives.length) ctx.addIssue({ code: "custom", path: ["objectives"], message: "IDs de pasos repetidos" });
});
export type CaseDefinition = z.infer<typeof caseSchema>;
export type CaseDetector = z.infer<typeof detectorSchema>;
export function defineCase(input: CaseDefinition): CaseDefinition { return caseSchema.parse(input); }
