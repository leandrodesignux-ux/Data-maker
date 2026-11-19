import { notFound, redirect } from "next/navigation";
import { caseById } from "@/cases/registry";
export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const definition = caseById[caseId.toUpperCase()];
  if (!definition) notFound();
  redirect(definition.startRoute);
}
