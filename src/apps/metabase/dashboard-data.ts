import { addDays, format, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { SIMULATED_TODAY } from "../../data/clock";
import { isBounce, stageAtLeast } from "../../data/generator";
import type { CrmRecord, Dataset, Session } from "../../data/model";
import { CANCELLATION_REASONS, PRIORITIES } from "../../data/universe";

export type MetabaseTab = "growth" | "supply" | "dev";
export type MetabaseGrain = "Day" | "Week" | "Month";
export interface MetabaseFilters {
  tab: MetabaseTab; grouping: MetabaseGrain; datePreset: string; dateAmount: number;
  from: string; to: string; leadType: string; sector: string; comparison: string;
  cohort: string; channel: string; traffic: string; campaign: string; priority: string;
  bridge: string; entryPoint: string; suspicious: string; role: string; cta: string;
  visitOrigin: string; visitStatus: string; agentSource: string; spotState: string;
}
export const defaultMetabaseFilters: MetabaseFilters = {
  tab: "growth", grouping: "Week", datePreset: "previous", dateAmount: 3, from: "", to: "",
  leadType: "", sector: "", comparison: "Month over Month", cohort: "Nuevo", channel: "",
  traffic: "Paid", campaign: "", priority: "", bridge: "", entryPoint: "Browse Page", suspicious: "0",
  role: "", cta: "", visitOrigin: "", visitStatus: "", agentSource: "", spotState: "",
};
export type MbMetric = "users" | "sessions" | "leads" | "attributedLeads" | "projects" | "visits" | "won" | "revenue" | "commission" | "bounces" | "organic" | "bridge" | "usersToLeads" | "leadsToProjects" | "projectsToVisits" | "bounceRate";
export interface MbBucket {
  period: string; users: number; sessions: number; leads: number; attributedLeads: number; projects: number; visits: number;
  won: number; revenue: number; commission: number; bounces: number; organic: number; bridge: number;
  priorities: Record<string, number>; projectPriorities: Record<string, number>; visitPriorities: Record<string, number>; agents: Record<string, number>; cancellations: Record<string, number>; highPriorityCancellations: Record<string, number>; standardCancellations: Record<string, number>;
  pipeline: Record<string, number>; pipelineCommission: Record<string, number>;
}
export interface MbData { current: MbBucket[]; previous: MbBucket[]; pipelineDaily: MbBucket[]; range: { from: string; to: string }; previousRange: { from: string; to: string }; totals: MbBucket; previousTotals: MbBucket; }

const iso = (date: Date) => format(date, "yyyy-MM-dd");
export function getMetabaseRange(filters: MetabaseFilters) {
  const today = new Date(`${SIMULATED_TODAY}T12:00:00Z`);
  const end = addDays(today, 1);
  let from: Date; let to: Date;
  if (filters.datePreset === "custom" && filters.from && filters.to) { from = new Date(`${filters.from}T12:00:00Z`); to = addDays(new Date(`${filters.to}T12:00:00Z`), 1); }
  else if (filters.datePreset === "thisMonth") { from = startOfMonth(today); to = end; }
  else if (filters.datePreset === "weeks") { from = subWeeks(end, Math.max(1, filters.dateAmount)); to = end; }
  else if (filters.datePreset === "days") { from = subDays(end, Math.max(1, filters.dateAmount)); to = end; }
  else { from = subMonths(end, Math.max(1, filters.dateAmount)); to = end; }
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  const previousTo = from;
  const previousFrom = filters.comparison === "Month over Month" ? subMonths(from, Math.max(1, filters.dateAmount)) : subDays(from, days);
  return { current: { from: iso(from), to: iso(to) }, previous: { from: iso(previousFrom), to: iso(previousTo) } };
}
function bucketDate(day: string, grain: MetabaseGrain) {
  if (grain === "Day") return day;
  const date = new Date(`${day}T12:00:00Z`);
  return grain === "Month" ? iso(startOfMonth(date)) : iso(startOfWeek(date, { weekStartsOn: 1 }));
}
const emptyBucket = (period: string): MbBucket => ({ period, users: 0, sessions: 0, leads: 0, attributedLeads: 0, projects: 0, visits: 0, won: 0, revenue: 0, commission: 0, bounces: 0, organic: 0, bridge: 0, priorities: {}, projectPriorities: {}, visitPriorities: {}, agents: {}, cancellations: {}, highPriorityCancellations: {}, standardCancellations: {}, pipeline: {}, pipelineCommission: {} });
const matchesSelected = (selected: string, value: string) => !selected || selected.split("|").includes(value);
function acceptsSession(s: Session, f: MetabaseFilters) {
  if (f.suspicious === "0" && s.isBot && s.botType !== "unclassified") return false;
  if (f.suspicious === "excludeAll" && s.isBot || f.suspicious === "1" && !s.isBot) return false;
  if (!matchesSelected(f.sector, s.sector) || !matchesSelected(f.channel, s.channel) || !matchesSelected(f.campaign, s.campaign) || !matchesSelected(f.entryPoint, s.entryPoint)) return false;
  if (f.traffic === "Paid" && !s.channel.startsWith("Paid") || f.traffic === "Organic" && !s.channel.startsWith("Organic") || f.traffic === "Direct" && s.channel !== "Direct") return false;
  if (f.cohort === "Nuevo" && !s.isNewUser || f.cohort === "Recurrente" && s.isNewUser) return false;
  if (f.cta && !s.events.some(event => matchesSelected(f.cta, event.name))) return false;
  if (!matchesSelected(f.visitOrigin, s.source)) return false;
  if (f.role && !f.role.split("|").some(role => role === "Business" ? ["Oficinas", "Locales comerciales"].includes(s.sector) : ["Bodegas", "Naves industriales"].includes(s.sector))) return false;
  if (f.spotState && !f.spotState.split("|").some(state => state === "Available" ? s.events.some(e => e.name === "clientInAvailableSpotDetail") : !s.events.some(e => e.name === "clientInAvailableSpotDetail"))) return false;
  return true;
}
function acceptsRecord(r: CrmRecord, f: MetabaseFilters) {
  return matchesSelected(f.leadType, r.leadType) && matchesSelected(f.priority, r.priority) && matchesSelected(f.agentSource, r.agentSource) && matchesSelected(f.visitStatus, r.status) && (!f.bridge || (f.bridge === "Priority" ? ["P0", "P1"].includes(r.priority) : !["P0", "P1"].includes(r.priority)));
}
function accumulate(dataset: Dataset, filters: MetabaseFilters, range: { from: string; to: string }): MbBucket[] {
  const map = new Map<string, MbBucket>();
  const users = new Map<string, Set<string>>();
  const ids = new Map<string, string>();
  for (const s of dataset.sessions) {
    if (s.day < range.from || s.day >= range.to || !acceptsSession(s, filters)) continue;
    const key = bucketDate(s.day, filters.grouping);
    const b = map.get(key) ?? emptyBucket(key); map.set(key, b);
    b.sessions++; if (isBounce(s)) b.bounces++;
    if (s.channel === "Organic Search") b.organic++;
    const seen = users.get(key) ?? new Set<string>(); users.set(key, seen);
    if (!seen.has(s.userId)) { b.users++; seen.add(s.userId); }
    ids.set(s.id, key);
  }
  for (const r of dataset.crm) {
    const key = ids.get(r.sessionId); if (!key || !acceptsRecord(r, filters)) continue;
    const b = map.get(key)!; b.leads++;
    if (r.agentSource !== "VIRTUAL") b.attributedLeads++;
    if (stageAtLeast(r, "project")) { b.projects++; b.projectPriorities[r.priority] = (b.projectPriorities[r.priority] ?? 0) + 1; }
    if (stageAtLeast(r, "requestVisit")) { b.visits++; b.visitPriorities[r.priority] = (b.visitPriorities[r.priority] ?? 0) + 1; }
    if (stageAtLeast(r, "won")) { b.won++; b.commission += r.commissionMXN; }
    // Metabase revenue is the expected brokerage commission, not the listing's transaction value.
    b.revenue += r.commissionMXN;
    if (stageAtLeast(r, "requestVisit") && ["P0", "P1"].includes(r.priority)) b.bridge++;
    b.priorities[r.priority] = (b.priorities[r.priority] ?? 0) + 1;
    b.agents[r.agentSource] = (b.agents[r.agentSource] ?? 0) + 1;
    if (r.cancellationReason) {
      b.cancellations[r.cancellationReason] = (b.cancellations[r.cancellationReason] ?? 0) + 1;
      const group = ["P0", "P1", "P2"].includes(r.priority) ? b.highPriorityCancellations : b.standardCancellations;
      group[r.cancellationReason] = (group[r.cancellationReason] ?? 0) + 1;
    }
    if (stageAtLeast(r, "project")) {
      const pipelineStage = stageAtLeast(r, "contract") ? "Contract" : stageAtLeast(r, "confirmedVisit") ? "Documentation" : "Intention Letter";
      b.pipeline[pipelineStage] = (b.pipeline[pipelineStage] ?? 0) + 1;
      b.pipelineCommission[pipelineStage] = (b.pipelineCommission[pipelineStage] ?? 0) + r.commissionMXN;
    }
  }
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
}
function total(rows: MbBucket[]) {
  const out = emptyBucket("Total");
  for (const b of rows) {
    for (const field of ["users", "sessions", "leads", "attributedLeads", "projects", "visits", "won", "revenue", "commission", "bounces", "organic", "bridge"] as const) out[field] += b[field];
    for (const field of ["priorities", "projectPriorities", "visitPriorities", "agents", "cancellations", "highPriorityCancellations", "standardCancellations", "pipeline", "pipelineCommission"] as const) for (const [key, value] of Object.entries(b[field])) out[field][key] = (out[field][key] ?? 0) + value;
  }
  return out;
}
export function buildMetabaseData(dataset: Dataset, filters: MetabaseFilters): MbData {
  const ranges = getMetabaseRange(filters);
  const current = accumulate(dataset, filters, ranges.current), previous = accumulate(dataset, filters, ranges.previous);
  const pipelineDaily = accumulate(dataset, { ...filters, grouping: "Day" }, ranges.current);
  return { current, previous, pipelineDaily, range: ranges.current, previousRange: ranges.previous, totals: total(current), previousTotals: total(previous) };
}
export function mbValue(b: MbBucket, metric: MbMetric): number {
  if (metric === "usersToLeads") return b.users ? b.leads / b.users * 100 : 0;
  if (metric === "leadsToProjects") return b.leads ? b.projects / b.leads * 100 : 0;
  if (metric === "projectsToVisits") return b.projects ? b.visits / b.projects * 100 : 0;
  if (metric === "bounceRate") return b.sessions ? b.bounces / b.sessions * 100 : 0;
  return b[metric];
}
export const priorityOrder = PRIORITIES;
export const cancellationOrder = CANCELLATION_REASONS;
export const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export const percentFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatMb(value: number, kind: "number" | "percent" | "money" = "number") {
  return kind === "percent" ? `${percentFormat.format(value)}%` : kind === "money" ? `$${numberFormat.format(value)}` : numberFormat.format(value);
}
