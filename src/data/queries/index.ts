import { differenceInCalendarDays, format, startOfWeek } from "date-fns";
import { dayAt, HISTORY_DAYS } from "../clock";
import { isBounce, isEngaged, stageAtLeast } from "../generator";
import type { CrmStage, Dataset, EventName, Interaction, Session } from "../model";
import { CRM_STAGES } from "../universe";

/** All `from` dates are inclusive and `to` dates are exclusive. Do not mutate a Dataset after querying it. */
export interface QueryFilter {
  from?: string; to?: string; channel?: Session["channel"]; source?: string; medium?: string;
  campaign?: string; device?: Session["device"]; browser?: Session["browser"]; os?: Session["os"];
  city?: Session["city"]; sector?: Session["sector"]; entryPoint?: Session["entryPoint"];
  landingPage?: string; botMode?: "all" | "excludeDetected" | "excludeAll";
}
export type SessionDimension = "channel" | "source" | "medium" | "campaign" | "referrer" | "device" | "browser" | "os" | "country" | "city" | "sector" | "entryPoint" | "landingPage" | "botType";
export type Metric = "sessions" | "users" | "leads" | "projects" | "requestVisits" | "won" | "revenueMXN" | "bounces" | "engaged";
export type Grain = "day" | "week" | "month";

const cache = new WeakMap<Dataset, Map<string, unknown>>();
function memo<T>(dataset: Dataset, key: string, compute: () => T): T {
  let entries = cache.get(dataset);
  if (!entries) { entries = new Map(); cache.set(dataset, entries); }
  if (entries.has(key)) return entries.get(key) as T;
  const value = compute(); entries.set(key, value); return value;
}

function matches(s: Session, filter: QueryFilter): boolean {
  if (filter.from && s.day < filter.from || filter.to && s.day >= filter.to) return false;
  const mode = filter.botMode ?? "excludeAll";
  if (mode === "excludeAll" && s.isBot || mode === "excludeDetected" && s.isBot && s.botType !== "unclassified") return false;
  for (const field of ["channel", "source", "medium", "campaign", "device", "browser", "os", "city", "sector", "entryPoint", "landingPage"] as const) {
    if (filter[field] !== undefined && s[field] !== filter[field]) return false;
  }
  return true;
}

export function selectSessions(dataset: Dataset, filter: QueryFilter = {}): readonly Session[] {
  return memo(dataset, `select:${JSON.stringify(filter)}`, () => dataset.sessions.filter(s => matches(s, filter)));
}

function recordsFor(dataset: Dataset, sessions: readonly Session[]) {
  const ids = new Set(sessions.map(s => s.id));
  return dataset.crm.filter(record => ids.has(record.sessionId));
}

function metricFromRows(dataset: Dataset, sessions: readonly Session[], metric: Metric): number {
  if (metric === "sessions") return sessions.length;
  if (metric === "users") return new Set(sessions.map(s => s.userId)).size;
  if (metric === "bounces") return sessions.filter(isBounce).length;
  if (metric === "engaged") return sessions.filter(isEngaged).length;
  const records = recordsFor(dataset, sessions);
  if (metric === "leads") return records.length;
  if (metric === "projects") return records.filter(r => stageAtLeast(r, "project")).length;
  if (metric === "requestVisits") return records.filter(r => stageAtLeast(r, "requestVisit")).length;
  if (metric === "won") return records.filter(r => stageAtLeast(r, "won")).length;
  return records.filter(r => stageAtLeast(r, "won")).reduce((sum, r) => sum + r.commissionMXN, 0);
}

export function metricValue(dataset: Dataset, metric: Metric, filter: QueryFilter = {}): number {
  return memo(dataset, `metric:${metric}:${JSON.stringify(filter)}`, () => metricFromRows(dataset, selectSessions(dataset, filter), metric));
}

function bucket(day: string, grain: Grain): string {
  if (grain === "day") return day;
  if (grain === "month") return day.slice(0, 7);
  return format(startOfWeek(new Date(`${day}T12:00:00Z`), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function timeSeries(dataset: Dataset, metric: Metric, grain: Grain, filter: QueryFilter = {}): ReadonlyArray<{ period: string; value: number }> {
  return memo(dataset, `series:${metric}:${grain}:${JSON.stringify(filter)}`, () => {
    const groups = new Map<string, Session[]>();
    for (const session of selectSessions(dataset, filter)) { const key = bucket(session.day, grain); const rows = groups.get(key) ?? []; rows.push(session); groups.set(key, rows); }
    return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([period, rows]) => ({ period, value: metricFromRows(dataset, rows, metric) }));
  });
}

export function aggregateBy(dataset: Dataset, dimension: SessionDimension, metric: Metric, filter: QueryFilter = {}): ReadonlyArray<{ key: string; value: number }> {
  return memo(dataset, `aggregate:${dimension}:${metric}:${JSON.stringify(filter)}`, () => {
    const groups = new Map<string, Session[]>();
    for (const session of selectSessions(dataset, filter)) { const key = String(session[dimension]); const rows = groups.get(key) ?? []; rows.push(session); groups.set(key, rows); }
    return [...groups].map(([key, rows]) => ({ key, value: metricFromRows(dataset, rows, metric) })).sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
  });
}

export function comparePeriods(dataset: Dataset, metric: Metric, filter: QueryFilter & { from: string; to: string }) {
  return memo(dataset, `compare:${metric}:${JSON.stringify(filter)}`, () => {
    const days = differenceInCalendarDays(new Date(`${filter.to}T12:00:00Z`), new Date(`${filter.from}T12:00:00Z`));
    const previousFromDate = new Date(`${filter.from}T12:00:00Z`); previousFromDate.setUTCDate(previousFromDate.getUTCDate() - days);
    const current = metricValue(dataset, metric, filter);
    const previous = metricValue(dataset, metric, { ...filter, from: previousFromDate.toISOString().slice(0, 10), to: filter.from });
    return { current, previous, deltaPct: previous ? (current - previous) / previous * 100 : null };
  });
}

export function eventCounts(dataset: Dataset, filter: QueryFilter = {}): ReadonlyArray<{ event: EventName; count: number }> {
  return memo(dataset, `events:${JSON.stringify(filter)}`, () => {
    const counts = new Map<EventName, number>();
    for (const session of selectSessions(dataset, filter)) for (const event of session.events) counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
    return [...counts].map(([event, count]) => ({ event, count })).sort((a, b) => b.count - a.count);
  });
}

export interface FunnelStep { event: EventName; users: number; completionRate: number; abandonmentRate: number }
export function eventFunnel(dataset: Dataset, steps: readonly EventName[], filter: QueryFilter = {}, breakdown?: SessionDimension): ReadonlyArray<{ segment: string; steps: FunnelStep[] }> {
  return memo(dataset, `funnel:${JSON.stringify(steps)}:${JSON.stringify(filter)}:${breakdown ?? ""}`, () => {
    const groups = new Map<string, Session[]>();
    for (const session of selectSessions(dataset, filter)) { const key = breakdown ? String(session[breakdown]) : "Total"; const rows = groups.get(key) ?? []; rows.push(session); groups.set(key, rows); }
    return [...groups].map(([segment, sessions]) => {
      let surviving = sessions;
      let previous = new Set(sessions.map(s => s.userId)).size;
      const funnelSteps = steps.map((name, index) => {
        surviving = surviving.filter(session => {
          const eventNames = [...session.events].sort((a, b) => a.at.localeCompare(b.at)).map(e => e.name);
          let position = -1;
          for (const expected of steps.slice(0, index + 1)) { position = eventNames.indexOf(expected, position + 1); if (position < 0) return false; }
          return true;
        });
        const users = new Set(surviving.map(s => s.userId)).size;
        const completionRate = previous ? users / previous : 0;
        previous = users;
        return { event: name, users, completionRate, abandonmentRate: 1 - completionRate };
      });
      return { segment, steps: funnelSteps };
    }).sort((a, b) => a.segment.localeCompare(b.segment));
  });
}

export function crmFunnel(dataset: Dataset, filter: QueryFilter = {}): ReadonlyArray<{ stage: CrmStage; count: number; conversionFromPrevious: number }> {
  return memo(dataset, `crmFunnel:${JSON.stringify(filter)}`, () => {
    const records = recordsFor(dataset, selectSessions(dataset, filter));
    let previous = records.length;
    return CRM_STAGES.map(stage => {
      const count = records.filter(r => stageAtLeast(r, stage)).length;
      const result = { stage, count, conversionFromPrevious: previous ? count / previous : 0 };
      previous = count; return result;
    });
  });
}

export function cvrMetrics(dataset: Dataset, filter: QueryFilter = {}) {
  return memo(dataset, `cvr:${JSON.stringify(filter)}`, () => {
    const sessions = selectSessions(dataset, filter);
    const users = new Set(sessions.map(s => s.userId)).size;
    const records = recordsFor(dataset, sessions);
    const projects = records.filter(r => stageAtLeast(r, "project"));
    return { usersToLeads: users ? records.length / users : 0, leadsToProjects: records.length ? projects.length / records.length : 0,
      projectsToRequestVisits: projects.length ? projects.filter(r => stageAtLeast(r, "requestVisit")).length / projects.length : 0,
      bounceRate: sessions.length ? sessions.filter(isBounce).length / sessions.length : 0,
      engagementRate: sessions.length ? sessions.filter(isEngaged).length / sessions.length : 0,
      deadClickRate: sessions.length ? sessions.filter(s => s.flags.deadClick).length / sessions.length : 0,
      rageClickRate: sessions.length ? sessions.filter(s => s.flags.rageClick).length / sessions.length : 0,
      quickBackRate: sessions.length ? sessions.filter(s => s.flags.quickBack).length / sessions.length : 0 };
  });
}

export function heatmapByElement(dataset: Dataset, filter: QueryFilter = {}, pagePath?: string): ReadonlyArray<{ elementId: string; selector: string; clicks: number; share: number; xPct: number; yPct: number; deadClicks: number; rageClicks: number }> {
  return memo(dataset, `heat:${JSON.stringify(filter)}:${pagePath ?? ""}`, () => {
    const points = new Map<string, { selector: string; clicks: number; x: number; y: number; deadClicks: number; rageClicks: number }>();
    for (const session of selectSessions(dataset, filter)) for (const interaction of session.interactions) {
      if (interaction.kind === "scroll" || interaction.kind === "error" || pagePath && interaction.page !== pagePath) continue;
      const row = points.get(interaction.elementId) ?? { selector: interaction.selector, clicks: 0, x: 0, y: 0, deadClicks: 0, rageClicks: 0 };
      row.clicks++; row.x += interaction.xPct; row.y += interaction.yPct;
      if (interaction.kind === "deadClick") row.deadClicks++;
      if (interaction.kind === "rageClick") row.rageClicks++;
      points.set(interaction.elementId, row);
    }
    const total = [...points.values()].reduce((sum, row) => sum + row.clicks, 0);
    return [...points].map(([elementId, row]) => ({ elementId, selector: row.selector, clicks: row.clicks, share: total ? row.clicks / total : 0, xPct: row.x / row.clicks, yPct: row.y / row.clicks, deadClicks: row.deadClicks, rageClicks: row.rageClicks })).sort((a, b) => b.clicks - a.clicks);
  });
}

export function scrollDistribution(dataset: Dataset, filter: QueryFilter = {}) {
  return memo(dataset, `scroll:${JSON.stringify(filter)}`, () => {
    const sessions = selectSessions(dataset, filter), cutoffs = [25, 50, 75, 100];
    return cutoffs.map((max, index) => ({ min: index ? cutoffs[index - 1] : 0, max, sessions: sessions.filter(s => s.scrollDepthPct >= (index ? cutoffs[index - 1] : 0) && s.scrollDepthPct < (max === 100 ? 101 : max)).length }));
  });
}

export function attentionDistribution(dataset: Dataset, filter: QueryFilter = {}) {
  return memo(dataset, `attention:${JSON.stringify(filter)}`, () => {
    const sessions = selectSessions(dataset, filter);
    return [0, 25, 50, 75].map(startPct => {
      const reached = sessions.filter(s => s.scrollDepthPct >= startPct);
      return { startPct, endPct: startPct + 25, sessions: reached.length, activeSeconds: reached.reduce((sum, s) => sum + s.activeTimeSec * (startPct === 0 ? 0.40 : startPct === 25 ? 0.30 : startPct === 50 ? 0.20 : 0.10), 0) };
    });
  });
}

export interface ReplayAction { atOffsetSec: number; type: Interaction["kind"] | "navigate" | "idle"; page: string; elementId?: string; xPct?: number; yPct?: number }
export function replayScript(dataset: Dataset, sessionId: string): ReadonlyArray<ReplayAction> {
  return memo(dataset, `replay:${sessionId}`, () => {
    const session = dataset.sessions.find(s => s.id === sessionId);
    if (!session) return [];
    const start = Date.parse(session.startedAt);
    const actions: ReplayAction[] = session.pageviews.map(p => ({ atOffsetSec: Math.max(0, (Date.parse(p.enteredAt) - start) / 1000), type: "navigate", page: p.path }));
    actions.push(...session.interactions.map(i => ({ atOffsetSec: i.atOffsetSec, type: i.kind, page: i.page, elementId: i.elementId, xPct: i.xPct, yPct: i.yPct })));
    if (session.activeTimeSec > 30) actions.push({ atOffsetSec: session.activeTimeSec, type: "idle", page: actions.at(-1)?.page ?? session.landingPage });
    actions.sort((a, b) => a.atOffsetSec - b.atOffsetSec);
    return actions;
  });
}

export function fullRangeFilter(): QueryFilter { return { from: dayAt(0), to: dayAt(HISTORY_DAYS) }; }
