import { addDays, format, subDays } from "date-fns";
import { SIMULATED_TODAY } from "../../data/clock";
import type { Dataset, Session } from "../../data/model";
import { PAGES } from "../../data/universe";

export type ClMode = "click" | "scroll";
export type ClDevice = "" | "desktop" | "tablet" | "mobile";
export type ClBehavior = "" | "deadClick" | "rageClick" | "quickBack" | "jsError";
export type ClUrlOperator = "contains" | "equals" | "startsWith";
export type ClClickKind = "all" | "dead" | "rage";
export interface ClFilters {
  datePreset: string; from: string; to: string;
  url: string; urlOperator: ClUrlOperator; device: ClDevice; browser: string; os: string; country: string; channel: string; campaign: string; source: string; referrer: string; sector: string; behavior: ClBehavior;
  page: string; mode: ClMode; clickKind: ClClickKind; compare: boolean;
  compareDevice: ClDevice; compareDatePreset: string; compareFrom: string; compareTo: string; compareBrowser: string; compareBehavior: ClBehavior;
}
export const defaultClFilters: ClFilters = {
  datePreset: "7d", from: "", to: "", url: "", urlOperator: "contains", device: "", browser: "", os: "", country: "", channel: "", campaign: "", source: "", referrer: "", sector: "", behavior: "",
  page: PAGES.spot, mode: "click", clickKind: "all", compare: false,
  compareDevice: "mobile", compareDatePreset: "7d", compareFrom: "", compareTo: "", compareBrowser: "", compareBehavior: "",
};
export const clNumber = (value: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value);
export const clDecimal = (value: number, digits = 2) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
export const clPercent = (value: number, digits = 2) => `${clDecimal(value * 100, digits)} %`;
export const CL_VOLUME_SCALE = 8;
export const clCount = (value: number) => clNumber(value * CL_VOLUME_SCALE);
export const clPageOptions = [
  { label: "Ficha de espacio", path: PAGES.spot },
  { label: "Inicio", path: PAGES.home },
  { label: "Listado de bodegas", path: PAGES.browse.Bodegas },
  { label: "Listado de oficinas", path: PAGES.browse.Oficinas },
  { label: "Listado de locales", path: PAGES.browse["Locales comerciales"] },
] as const;
const cache = new WeakMap<Dataset, Map<string, unknown>>();
function memo<T>(dataset: Dataset, key: string, compute: () => T): T {
  let map = cache.get(dataset); if (!map) { map = new Map(); cache.set(dataset, map); }
  if (map.has(key)) return map.get(key) as T;
  const value = compute(); map.set(key, value); return value;
}
const iso = (date: Date) => format(date, "yyyy-MM-dd");
export function clRange(filters: ClFilters, comparison = false) {
  const preset = comparison ? filters.compareDatePreset : filters.datePreset;
  const fromInput = comparison ? filters.compareFrom : filters.from, toInput = comparison ? filters.compareTo : filters.to;
  const today = new Date(`${SIMULATED_TODAY}T12:00:00Z`), end = addDays(today, 1);
  let from = subDays(end, Number.parseInt(preset, 10) || 7), to = end;
  if (preset === "custom" && fromInput && toInput) { from = new Date(`${fromInput}T12:00:00Z`); to = addDays(new Date(`${toInput}T12:00:00Z`), 1); }
  return { from: iso(from), to: iso(to) };
}
export function clRangeLabel(filters: ClFilters, comparison = false) {
  const preset = comparison ? filters.compareDatePreset : filters.datePreset;
  return preset === "custom" ? "Personalizado" : preset === "1d" ? "Último día" : `Últimos ${Number.parseInt(preset, 10) || 7} días`;
}
function urlMatches(path: string, value: string, operator: ClUrlOperator) {
  const p = path.toLowerCase(), v = value.toLowerCase();
  return operator === "equals" ? p === v : operator === "startsWith" ? p.startsWith(v) : p.includes(v);
}
export function clSessions(dataset: Dataset, filters: ClFilters, comparison = false, includeBots = false): readonly Session[] {
  return memo(dataset, `sessions:${JSON.stringify(filters)}:${comparison}:${includeBots}`, () => {
    const range = clRange(filters, comparison);
    const device = comparison ? filters.compareDevice : filters.device;
    const browser = comparison ? filters.compareBrowser : filters.browser;
    const behavior = comparison ? filters.compareBehavior : filters.behavior;
    return dataset.sessions.filter(s => {
      if (s.day < range.from || s.day >= range.to || !includeBots && s.isBot) return false;
      if (device && s.device !== device || browser && s.browser !== browser || filters.os && s.os !== filters.os || filters.country && s.country !== filters.country || filters.channel && s.channel !== filters.channel || filters.campaign && s.campaign !== filters.campaign || filters.source && s.source !== filters.source || filters.referrer && s.referrer !== filters.referrer || filters.sector && s.sector !== filters.sector) return false;
      if (filters.url && !s.pageviews.some(view => urlMatches(view.path, filters.url, filters.urlOperator))) return false;
      if (behavior && !s.flags[behavior]) return false;
      return true;
    });
  });
}
export function clPageSessions(dataset: Dataset, filters: ClFilters, comparison = false): readonly Session[] {
  return memo(dataset, `page-sessions:${JSON.stringify(filters)}:${comparison}`, () => clSessions(dataset, filters, comparison).filter(s => s.pageviews.some(view => view.path === filters.page)));
}
export type ClHeatElement = { elementId: string; selector: string; clicks: number; share: number; deadClicks: number; rageClicks: number; offsets: { x: number; y: number }[] };
export function clHeatElements(dataset: Dataset, filters: ClFilters, comparison = false): readonly ClHeatElement[] {
  return memo(dataset, `heat:${JSON.stringify(filters)}:${comparison}`, () => {
    const groups = new Map<string, Omit<ClHeatElement, "elementId" | "share">>();
    for (const s of clPageSessions(dataset, filters, comparison)) for (const i of s.interactions) {
      if (i.page !== filters.page || i.kind === "scroll" || i.kind === "error") continue;
      if (filters.clickKind === "dead" && i.kind !== "deadClick" || filters.clickKind === "rage" && i.kind !== "rageClick") continue;
      const row = groups.get(i.elementId) ?? { selector: i.selector, clicks: 0, deadClicks: 0, rageClicks: 0, offsets: [] };
      row.clicks++; if (i.kind === "deadClick") row.deadClicks++; if (i.kind === "rageClick") row.rageClicks++;
      if (row.offsets.length < 64) row.offsets.push({ x: i.xPct, y: i.yPct });
      groups.set(i.elementId, row);
    }
    const total = [...groups.values()].reduce((sum, row) => sum + row.clicks, 0);
    return [...groups].map(([elementId, row]) => ({ elementId, ...row, share: row.clicks / Math.max(1, total) })).sort((a, b) => b.clicks - a.clicks || a.elementId.localeCompare(b.elementId));
  });
}
export function clScroll(dataset: Dataset, filters: ClFilters, comparison = false) {
  return memo(dataset, `scroll:${JSON.stringify(filters)}:${comparison}`, () => {
    const sessions = clPageSessions(dataset, filters, comparison), total = sessions.length;
    const reach = (depth: number) => sessions.filter(s => s.scrollDepthPct >= depth).length / Math.max(1, total);
    const mean = sessions.reduce((sum, s) => sum + s.scrollDepthPct, 0) / Math.max(1, total);
    return { total, mean, reach, rows: [0, 25, 50, 75, 100].map(depth => ({ depth, sessions: Math.round(reach(depth) * total), rate: reach(depth) })) };
  });
}
export function clSummary(dataset: Dataset, filters: ClFilters) {
  return memo(dataset, `summary:${JSON.stringify(filters)}`, () => {
    const sessions = clSessions(dataset, filters), all = clSessions(dataset, filters, false, true), total = sessions.length;
    const countFlag = (flag: keyof Session["flags"]) => sessions.filter(s => s.flags[flag]).length;
    const unique = new Set(sessions.map(s => s.userId)).size;
    const pageviews = sessions.reduce((sum, s) => sum + s.pageviews.length, 0);
    const avgScroll = sessions.reduce((sum, s) => sum + s.scrollDepthPct, 0) / Math.max(1, total);
    const avgActiveSec = sessions.reduce((sum, s) => sum + s.activeTimeSec, 0) / Math.max(1, total);
    const newSessions = sessions.filter(s => s.isNewUser).length;
    return { sessions, all, total, unique, pageviews, pagesPerSession: pageviews / Math.max(1, total), avgScroll, avgActiveSec, newSessions, returningSessions: total - newSessions,
      rageClicks: countFlag("rageClick"), deadClicks: countFlag("deadClick"), excessiveScroll: countFlag("excessiveScroll"), quickBack: countFlag("quickBack"), jsErrors: countFlag("jsError"), bots: all.filter(s => s.isBot).length };
  });
}
export type ClDimension = "referrer" | "channel" | "campaign" | "source" | "browser" | "device" | "os" | "page" | "entryPage";
export function clGroup(dataset: Dataset, filters: ClFilters, dimension: ClDimension) {
  return memo(dataset, `group:${JSON.stringify(filters)}:${dimension}`, () => {
    const groups = new Map<string, number>();
    for (const s of clSessions(dataset, filters)) {
      if (dimension === "page") { for (const view of s.pageviews) groups.set(view.path, (groups.get(view.path) ?? 0) + 1); }
      else { const value = dimension === "entryPage" ? s.landingPage : String(s[dimension]); groups.set(value, (groups.get(value) ?? 0) + 1); }
    }
    return [...groups].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  });
}
export function clEventRows(dataset: Dataset, filters: ClFilters) {
  return memo(dataset, `events:${JSON.stringify(filters)}`, () => {
    const defs = [
      ["Buscar", "clientSearchedSpotSearch"], ["Buscar una ubicación", "clientSearchedSpotSearch"], ["Ponerse en contacto", "clientOpenedLeadPopup"],
      ["Enviar formulario", "clientRequestedWhatsappForm"], ["Abrir filtros", "clientOpenedFilterPrice"], ["Visitar ficha", "clientInAvailableSpotDetail"],
    ] as const;
    const sessions = clSessions(dataset, filters);
    return defs.map(([label, event]) => ({ label, count: sessions.filter(s => s.events.some(item => item.name === event)).length, page: event === "clientSearchedSpotSearch" ? PAGES.home : event === "clientOpenedFilterPrice" ? PAGES.browse.Bodegas : PAGES.spot }));
  });
}
export function clPerformance(dataset: Dataset, filters: ClFilters) {
  return memo(dataset, `performance:${JSON.stringify(filters)}`, () => {
    const sessions = clSessions(dataset, filters), n = Math.max(1, sessions.length);
    const lcp = sessions.reduce((sum, s) => sum + 1.4 + s.pageviews.length * .2 + (s.device === "mobile" ? .7 : 0) + (s.flags.jsError ? .5 : 0), 0) / n;
    const inp = sessions.reduce((sum, s) => sum + 120 + s.activeTimeSec * 1.7 + (s.flags.rageClick ? 150 : 0), 0) / n;
    const cls = sessions.reduce((sum, s) => sum + .035 + s.pageviews.length * .008 + (s.flags.jsError ? .08 : 0), 0) / n;
    const good = sessions.filter(s => !s.flags.jsError && !s.flags.rageClick && s.activeTimeSec >= 10).length / n;
    return { lcp, inp, cls, good, score: Math.round((good * .55 + Math.max(0, 1 - lcp / 5) * .25 + Math.max(0, 1 - inp / 600) * .2) * 100) };
  });
}
