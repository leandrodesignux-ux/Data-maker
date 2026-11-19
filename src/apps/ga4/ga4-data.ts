import { addDays, format, startOfMonth, startOfWeek, subDays } from "date-fns";
import { SIMULATED_TODAY } from "../../data/clock";
import { isEngaged, stageAtLeast } from "../../data/generator";
import { hash32 } from "../../data/prng";
import type { Dataset, EventName, Session } from "../../data/model";
import { EVENTS } from "../../data/universe";

export type GaGrain = "day" | "week" | "month";
export type GaDimension = "channel" | "sourceMedium" | "campaign" | "device" | "browser" | "os" | "city" | "sector" | "entryPoint" | "source" | "page";
export type GaOperator = "equals" | "notEquals" | "contains";
export interface GaCondition { dimension: GaDimension; operator: GaOperator; value: string }
export interface GaFilters {
  datePreset: string; from: string; to: string; comparePeriod: boolean; grain: GaGrain;
  segmentDimension: "" | "device" | "channel" | "userType"; segmentValue: string;
  conditions: string; dimension: GaDimension; secondary: "" | GaDimension;
}
export const defaultGaFilters: GaFilters = { datePreset: "28d", from: "", to: "", comparePeriod: false, grain: "day", segmentDimension: "", segmentValue: "", conditions: "", dimension: "channel", secondary: "" };
const esNumber = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const esDecimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const gaNumber = (value: number) => esNumber.format(value);
export const gaDecimal = (value: number) => esDecimal.format(value);
export const gaPercent = (value: number) => `${esDecimal.format(value * 100)} %`;
export const gaCurrency = (value: number) => `${esDecimal.format(value)} $`;
const iso = (date: Date) => format(date, "yyyy-MM-dd");

export function gaRange(filters: GaFilters) {
  const today = new Date(`${SIMULATED_TODAY}T12:00:00Z`);
  const end = addDays(today, 1);
  let from = subDays(end, 28), to = end;
  if (filters.datePreset === "today") from = today;
  else if (filters.datePreset === "yesterday") { from = subDays(today, 1); to = today; }
  else if (filters.datePreset === "7d") from = subDays(end, 7);
  else if (filters.datePreset === "90d") from = subDays(end, 90);
  else if (filters.datePreset === "month") from = startOfMonth(today);
  else if (filters.datePreset === "custom" && filters.from && filters.to) { from = new Date(`${filters.from}T12:00:00Z`); to = addDays(new Date(`${filters.to}T12:00:00Z`), 1); }
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  return { current: { from: iso(from), to: iso(to) }, previous: { from: iso(subDays(from, days)), to: iso(from) } };
}
export function gaRangeLabel(filters: GaFilters) {
  const range = gaRange(filters).current;
  const label = filters.datePreset === "today" ? "hoy" : filters.datePreset === "yesterday" ? "ayer" : filters.datePreset === "7d" ? "los últimos 7 días" : filters.datePreset === "90d" ? "los últimos 90 días" : filters.datePreset === "month" ? "este mes" : filters.datePreset === "custom" ? "personalizado" : "los últimos 28 días";
  const pretty = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${label}  ${pretty(range.from)}–${pretty(iso(subDays(new Date(`${range.to}T12:00:00Z`), 1)))}`;
}
export function parseGaConditions(raw: string): GaCondition[] {
  if (!raw) return [];
  try { const value: unknown = JSON.parse(raw); return Array.isArray(value) ? value.filter((item): item is GaCondition => typeof item === "object" && item !== null && typeof item.dimension === "string" && typeof item.operator === "string" && typeof item.value === "string") : []; }
  catch { return []; }
}
export function gaDimensionValue(s: Session, dimension: GaDimension): string {
  if (dimension === "sourceMedium") return `${s.source} / ${s.medium}`;
  if (dimension === "page") return s.landingPage;
  return String(s[dimension]);
}
function meetsCondition(s: Session, condition: GaCondition) {
  const value = gaDimensionValue(s, condition.dimension).toLocaleLowerCase();
  const expected = condition.value.toLocaleLowerCase();
  return condition.operator === "contains" ? value.includes(expected) : condition.operator === "notEquals" ? value !== expected : value === expected;
}
export type GaSegment = "all" | "comparison";
const cache = new WeakMap<Dataset, Map<string, unknown>>();
function memo<T>(dataset: Dataset, key: string, calculate: () => T): T {
  let map = cache.get(dataset); if (!map) { map = new Map(); cache.set(dataset, map); }
  if (map.has(key)) return map.get(key) as T;
  const result = calculate(); map.set(key, result); return result;
}
export function gaSessions(dataset: Dataset, filters: GaFilters, segment: GaSegment = "all", previous = false): readonly Session[] {
  return memo(dataset, `gaSessions:${JSON.stringify(filters)}:${segment}:${previous}`, () => {
    const range = gaRange(filters)[previous ? "previous" : "current"];
    const conditions = parseGaConditions(filters.conditions);
    return dataset.sessions.filter(s => {
      if (s.isBot || s.day < range.from || s.day >= range.to || conditions.some(condition => !meetsCondition(s, condition))) return false;
      if (segment === "comparison" && filters.segmentDimension && filters.segmentValue) {
        const value = filters.segmentDimension === "userType" ? s.isNewUser ? "Nuevo" : "Recurrente" : s[filters.segmentDimension];
        if (value !== filters.segmentValue) return false;
      }
      return true;
    });
  });
}
export function gaSegmentLabel(filters: GaFilters) {
  return filters.segmentDimension && filters.segmentValue ? `${filters.segmentDimension === "device" ? "Dispositivo" : filters.segmentDimension === "channel" ? "Canal" : "Tipo de usuario"}: ${filters.segmentValue}` : "Todos los usuarios";
}
export function gaBucket(day: string, grain: GaGrain) {
  if (grain === "day") return day;
  const date = new Date(`${day}T12:00:00Z`);
  return grain === "month" ? iso(startOfMonth(date)) : iso(startOfWeek(date, { weekStartsOn: 1 }));
}
export interface GaEventRow { key: string; events: number; users: number; eventsPerUser: number; revenue: number }
export function gaEventRows(dataset: Dataset, filters: GaFilters, segment: GaSegment = "all", previous = false): GaEventRow[] {
  return memo(dataset, `gaEventRows:${JSON.stringify(filters)}:${segment}:${previous}`, () => {
    const groups = new Map<string, { count: number; users: Set<string> }>();
    for (const s of gaSessions(dataset, filters, segment, previous)) for (const event of s.events) {
      const row = groups.get(event.name) ?? { count: 0, users: new Set<string>() };
      row.count++; row.users.add(s.userId); groups.set(event.name, row);
    }
    return [...groups].map(([key, value]) => ({ key, events: value.count, users: value.users.size, eventsPerUser: value.count / Math.max(1, value.users.size), revenue: 0 })).sort((a, b) => b.events - a.events);
  });
}
export function gaEventTableRows(dataset: Dataset, filters: GaFilters, segment: GaSegment = "all") {
  if (!filters.secondary) return gaEventRows(dataset, filters, segment).map(row => ({ ...row, primary: row.key, secondary: "" }));
  return memo(dataset, `gaEventTable:${JSON.stringify(filters)}:${segment}`, () => {
    const groups = new Map<string, { primary: string; secondary: string; events: number; users: Set<string> }>();
    for (const s of gaSessions(dataset, filters, segment)) for (const event of s.events) {
      const secondary = gaDimensionValue(s, filters.secondary as GaDimension), key = `${event.name}\u0000${secondary}`;
      const row = groups.get(key) ?? { primary: event.name, secondary, events: 0, users: new Set<string>() };
      row.events++; row.users.add(s.userId); groups.set(key, row);
    }
    return [...groups].map(([key, row]) => ({ key, primary: row.primary, secondary: row.secondary, events: row.events, users: row.users.size, eventsPerUser: row.events / Math.max(1, row.users.size), revenue: 0 })).sort((a, b) => b.events - a.events);
  });
}
export type GaMeasure = "events" | "sessions" | "users" | "views";
export function gaSeries(dataset: Dataset, filters: GaFilters, measure: GaMeasure, keys: readonly string[] = [], segment: GaSegment = "all", previous = false) {
  return memo(dataset, `gaSeries:${JSON.stringify(filters)}:${measure}:${JSON.stringify(keys)}:${segment}:${previous}`, () => {
    const rows = gaSessions(dataset, filters, segment, previous);
    const groups = new Map<string, { total: number; byKey: Map<string, number>; users: Set<string> }>();
    for (const s of rows) {
      const period = gaBucket(s.day, filters.grain);
      const g = groups.get(period) ?? { total: 0, byKey: new Map(), users: new Set<string>() }; groups.set(period, g);
      if (measure === "sessions") g.total++;
      else if (measure === "users") g.users.add(s.userId);
      else if (measure === "views") { g.total += s.pageviews.length; for (const view of s.pageviews) g.byKey.set(view.path, (g.byKey.get(view.path) ?? 0) + 1); }
      else for (const event of s.events) { g.total++; g.byKey.set(event.name, (g.byKey.get(event.name) ?? 0) + 1); }
    }
    const periods = [...groups.keys()].sort();
    return { periods, total: periods.map(period => measure === "users" ? groups.get(period)!.users.size : groups.get(period)!.total), byKey: Object.fromEntries(keys.map(key => [key, periods.map(period => groups.get(period)!.byKey.get(key) ?? 0)])) as Record<string, number[]> };
  });
}
export interface GaTrafficRow { key: string; sessions: number; users: number; engaged: number; engagementRate: number; averageTimeSec: number; keyEvents: number; revenue: number }
const keyEventNames = new Set<EventName>(["clientRequestedWhatsappForm", "clientRequestedVisit", "clientClickedContactLead"]);
export function gaTrafficRows(dataset: Dataset, filters: GaFilters, segment: GaSegment = "all", previous = false): GaTrafficRow[] {
  return memo(dataset, `gaTraffic:${JSON.stringify(filters)}:${segment}:${previous}`, () => {
    const groups = new Map<string, { sessions: number; users: Set<string>; engaged: number; time: number; keyEvents: number; ids: Set<string> }>();
    for (const s of gaSessions(dataset, filters, segment, previous)) {
      const key = gaDimensionValue(s, filters.dimension);
      const g = groups.get(key) ?? { sessions: 0, users: new Set<string>(), engaged: 0, time: 0, keyEvents: 0, ids: new Set<string>() };
      g.sessions++; g.users.add(s.userId); if (isEngaged(s)) g.engaged++; g.time += s.activeTimeSec; g.keyEvents += s.events.filter(event => keyEventNames.has(event.name)).length; g.ids.add(s.id); groups.set(key, g);
    }
    return [...groups].map(([key, g]) => ({ key, sessions: g.sessions, users: g.users.size, engaged: g.engaged, engagementRate: g.engaged / Math.max(1, g.sessions), averageTimeSec: g.time / Math.max(1, g.sessions), keyEvents: g.keyEvents, revenue: dataset.crm.filter(record => g.ids.has(record.sessionId) && stageAtLeast(record, "won")).reduce((sum, record) => sum + record.commissionMXN, 0) })).sort((a, b) => b.sessions - a.sessions);
  });
}
export function gaTrafficTableRows(dataset: Dataset, filters: GaFilters, segment: GaSegment = "all") {
  if (!filters.secondary) return gaTrafficRows(dataset, filters, segment).map(row => ({ ...row, primary: row.key, secondary: "" }));
  return memo(dataset, `gaTrafficTable:${JSON.stringify(filters)}:${segment}`, () => {
    const groups = new Map<string, { primary: string; secondary: string; sessions: number; engaged: number; time: number; keyEvents: number }>();
    for (const s of gaSessions(dataset, filters, segment)) {
      const primary = gaDimensionValue(s, filters.dimension), secondary = gaDimensionValue(s, filters.secondary as GaDimension), key = `${primary}\u0000${secondary}`;
      const row = groups.get(key) ?? { primary, secondary, sessions: 0, engaged: 0, time: 0, keyEvents: 0 };
      row.sessions++; if (isEngaged(s)) row.engaged++; row.time += s.activeTimeSec; row.keyEvents += s.events.filter(event => keyEventNames.has(event.name)).length; groups.set(key, row);
    }
    return [...groups].map(([key, row]) => ({ key, primary: row.primary, secondary: row.secondary, sessions: row.sessions, engagementRate: row.engaged / row.sessions, averageTimeSec: row.time / row.sessions, keyEvents: row.keyEvents })).sort((a, b) => b.sessions - a.sessions);
  });
}
export interface GaPageRow { key: string; views: number; users: number; viewsPerUser: number; averageTimeSec: number; keyEvents: number }
export function gaPageRows(dataset: Dataset, filters: GaFilters, segment: GaSegment = "all"): GaPageRow[] {
  return memo(dataset, `gaPages:${JSON.stringify(filters)}:${segment}`, () => {
    const groups = new Map<string, { views: number; users: Set<string>; time: number; keyEvents: number }>();
    for (const s of gaSessions(dataset, filters, segment)) for (const view of s.pageviews) {
      const g = groups.get(view.path) ?? { views: 0, users: new Set<string>(), time: 0, keyEvents: 0 };
      g.views++; g.users.add(s.userId); g.time += view.activeTimeSec; g.keyEvents += s.events.filter(event => event.page === view.path && keyEventNames.has(event.name)).length; groups.set(view.path, g);
    }
    return [...groups].map(([key, g]) => ({ key, views: g.views, users: g.users.size, viewsPerUser: g.views / Math.max(1, g.users.size), averageTimeSec: g.time / Math.max(1, g.views), keyEvents: g.keyEvents })).sort((a, b) => b.views - a.views);
  });
}
export function gaPageTableRows(dataset: Dataset, filters: GaFilters, segment: GaSegment = "all") {
  if (!filters.secondary) return gaPageRows(dataset, filters, segment).map(row => ({ ...row, primary: row.key, secondary: "" }));
  return memo(dataset, `gaPageTable:${JSON.stringify(filters)}:${segment}`, () => {
    const groups = new Map<string, { primary: string; secondary: string; views: number; users: Set<string>; time: number }>();
    for (const s of gaSessions(dataset, filters, segment)) for (const view of s.pageviews) {
      const primary = view.path, secondary = gaDimensionValue(s, filters.secondary as GaDimension), key = `${primary}\u0000${secondary}`;
      const row = groups.get(key) ?? { primary, secondary, views: 0, users: new Set<string>(), time: 0 };
      row.views++; row.users.add(s.userId); row.time += view.activeTimeSec; groups.set(key, row);
    }
    return [...groups].map(([key, row]) => ({ key, primary: row.primary, secondary: row.secondary, views: row.views, users: row.users.size, viewsPerUser: row.views / Math.max(1, row.users.size), averageTimeSec: row.time / row.views })).sort((a, b) => b.views - a.views);
  });
}
export function gaEventBreakdown(dataset: Dataset, filters: GaFilters, eventName: string, dimension: GaDimension, segment: GaSegment = "all") {
  return memo(dataset, `gaEventBreakdown:${JSON.stringify(filters)}:${eventName}:${dimension}:${segment}`, () => {
    const groups = new Map<string, { events: number; users: Set<string> }>();
    for (const s of gaSessions(dataset, filters, segment)) {
      const count = s.events.filter(event => event.name === eventName).length; if (!count) continue;
      const key = gaDimensionValue(s, dimension), g = groups.get(key) ?? { events: 0, users: new Set<string>() };
      g.events += count; g.users.add(s.userId); groups.set(key, g);
    }
    return [...groups].map(([key, g]) => ({ key, events: g.events, users: g.users.size, eventsPerUser: g.events / Math.max(1, g.users.size), revenue: 0 })).sort((a, b) => b.events - a.events);
  });
}
export function gaEventDetail(dataset: Dataset, filters: GaFilters, eventName: string, segment: GaSegment = "all") {
  const sessions = gaSessions(dataset, filters, segment).filter(s => s.events.some(event => event.name === eventName));
  const events = sessions.reduce((sum, s) => sum + s.events.filter(event => event.name === eventName).length, 0);
  const users = new Set(sessions.map(s => s.userId)).size;
  const female = sessions.filter(s => hash32(s.userId, dataset.seed) % 100 < 56).length;
  const countries = new Map<string, number>(); for (const s of sessions) countries.set(s.country, (countries.get(s.country) ?? 0) + s.events.filter(event => event.name === eventName).length);
  return { events, users, eventsPerUser: events / Math.max(1, users), eventsPerSession: events / Math.max(1, gaSessions(dataset, filters, segment).length), female, male: sessions.length - female, countries: [...countries].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), sessions };
}
export interface GaFunnelStep { label: string; event: EventName; direct: boolean; parameter?: string; parameterValue?: string }
export const defaultGaSteps: GaFunnelStep[] = [
  { label: "1. Explora listado (BP)", event: "page_view", direct: false, parameter: "entryPoint", parameterValue: "Browse Page" },
  { label: "2. Click en card", event: "clientClickedSpotCardBrowsePage", direct: false },
  { label: "3. Entra a ficha (Spot Detail)", event: "clientInAvailableSpotDetail", direct: false },
  { label: "4. Abre contacto (WA o Contactar)", event: "clientOpenedLeadPopup", direct: false },
];
export function parseGaSteps(raw: string): GaFunnelStep[] {
  if (!raw) return defaultGaSteps;
  try { const value: unknown = JSON.parse(raw); return Array.isArray(value) && value.length > 0 ? value.filter((item): item is GaFunnelStep => typeof item?.label === "string" && EVENTS.includes(item?.event)) : defaultGaSteps; }
  catch { return defaultGaSteps; }
}
function stepMatches(s: Session, step: GaFunnelStep) {
  if (step.parameter === "entryPoint" && step.parameterValue && s.entryPoint !== step.parameterValue) return false;
  if (step.parameter === "device" && step.parameterValue && s.device !== step.parameterValue) return false;
  if (step.parameter === "browser" && step.parameterValue && s.browser !== step.parameterValue) return false;
  return true;
}
export function gaFunnel(dataset: Dataset, filters: GaFilters, steps: GaFunnelStep[], breakdown: GaDimension | "none", open: boolean, segment: GaSegment = "all") {
  return memo(dataset, `gaFunnel:${JSON.stringify(filters)}:${JSON.stringify(steps)}:${breakdown}:${open}:${segment}`, () => {
    const groups = new Map<string, Session[]>();
    for (const s of gaSessions(dataset, filters, segment)) {
      const key = breakdown === "none" ? "Total" : gaDimensionValue(s, breakdown);
      const rows = groups.get(key) ?? []; rows.push(s); groups.set(key, rows);
    }
    const result = [...groups].map(([key, sessions]) => {
      const counts = steps.map((step, index) => {
        let reached = 0;
        for (const s of sessions) {
          const events = [...s.events].sort((a, b) => a.at.localeCompare(b.at));
          const startIndex = open ? index : 0;
          let position = -1; let passed = true;
          for (let j = startIndex; j <= index; j++) {
            if (!stepMatches(s, steps[j])) { passed = false; break; }
            const next = events.findIndex((event, eventIndex) => eventIndex > position && event.name === steps[j].event && (!steps[j].direct || eventIndex === position + 1));
            if (next < 0) { passed = false; break; } position = next;
          }
          if (passed) reached++;
        }
        return reached;
      });
      return { key, counts, completion: counts.map((count, index) => index ? count / Math.max(1, counts[index - 1]) : 1), abandonment: counts.map((count, index) => index < counts.length - 1 ? Math.max(0, count - counts[index + 1]) : 0) };
    }).sort((a, b) => a.key === "Total" ? -1 : b.key === "Total" ? 1 : a.key.localeCompare(b.key));
    const total = steps.map((_, index) => result.reduce((sum, row) => sum + row.counts[index], 0));
    return { rows: result, total, completion: total.map((count, index) => index ? count / Math.max(1, total[index - 1]) : 1), abandonment: total.map((count, index) => index < total.length - 1 ? Math.max(0, count - total[index + 1]) : 0) };
  });
}
