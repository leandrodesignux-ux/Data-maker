"use client";
import { useAppPortalContainer } from "@/components/shared/AppPortalContainer";

import { useEffect, useMemo, useState } from "react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Bookmark, Clock3, Info, MoreHorizontal, Pencil, RotateCcw, Share2, X } from "lucide-react";
import { AppSwitcher } from "@/components/shared/AppSwitcher";
import { SimulatorBadge } from "@/components/shared/SimulatorBadge";
import { CaseDock } from "@/components/shared/CaseDock";
import { AppPortalContainer } from "@/components/shared/AppPortalContainer";
import { Unavailable } from "@/components/shared/Unavailable";
import { getClientDataset } from "@/data/client";
import type { Dataset } from "@/data/model";
import { buildMetabaseData, defaultMetabaseFilters, formatMb, mbValue, type MbData, type MbMetric, type MetabaseFilters } from "../dashboard-data";
import { useMetabaseStore } from "../store";
import { MetabaseCard } from "./MetabaseCard";
import { MetabaseFilterBar } from "./MetabaseFilters";
import "../chrome.css";
import "../dashboard.css";

const parsers = {
  tab: parseAsStringLiteral(["growth", "supply", "dev"] as const).withDefault("growth"),
  grouping: parseAsStringLiteral(["Day", "Week", "Month"] as const).withDefault("Week"),
  datePreset: parseAsString.withDefault("previous"), dateAmount: parseAsInteger.withDefault(3),
  from: parseAsString.withDefault(""), to: parseAsString.withDefault(""),
  leadType: parseAsString.withDefault(""), sector: parseAsString.withDefault(""),
  comparison: parseAsString.withDefault("Month over Month"), cohort: parseAsString.withDefault("Nuevo"),
  channel: parseAsString.withDefault(""), traffic: parseAsString.withDefault("Paid"),
  campaign: parseAsString.withDefault(""), priority: parseAsString.withDefault(""),
  bridge: parseAsString.withDefault(""), entryPoint: parseAsString.withDefault("Browse Page"),
  suspicious: parseAsString.withDefault("0"), role: parseAsString.withDefault(""),
  cta: parseAsString.withDefault(""), visitOrigin: parseAsString.withDefault(""),
  visitStatus: parseAsString.withDefault(""), agentSource: parseAsString.withDefault(""),
  spotState: parseAsString.withDefault(""),
};
type Kpi = { title: string; metric: MbMetric; kind?: "percent" | "money"; inverse?: boolean };
const growthKpis: Kpi[] = [
  { title: "Leads", metric: "leads" }, { title: "CVR users - Leads", metric: "usersToLeads", kind: "percent" },
  { title: "CVR Leads - Projects", metric: "leadsToProjects", kind: "percent" }, { title: "CVR Projects - Request Visits", metric: "projectsToVisits", kind: "percent" },
  { title: "A. Puente RV", metric: "bridge" }, { title: "Bounce Rate", metric: "bounceRate", kind: "percent", inverse: true },
  { title: "Organic Search Traffic", metric: "organic" },
];
const supplyKpis: Kpi[] = [{ title: "Projects", metric: "projects" }, { title: "Request Visits", metric: "visits" }, { title: "CVR Projects - Request Visits", metric: "projectsToVisits", kind: "percent" }, { title: "Won", metric: "won" }];
const devKpis: Kpi[] = [{ title: "Users", metric: "users" }, { title: "Sessions", metric: "sessions" }, { title: "Bounce Rate", metric: "bounceRate", kind: "percent", inverse: true }, { title: "Gross Commission", metric: "commission", kind: "money" }];

function KpiCard({ item, data }: { item: Kpi; data: MbData }) {
  const portalContainer = useAppPortalContainer();
  const [modal, setModal] = useState<"table" | "full" | null>(null);
  const current = mbValue(data.totals, item.metric), previous = mbValue(data.previousTotals, item.metric);
  const delta = previous ? (current - previous) / previous * 100 : 0;
  const favorable = item.inverse ? delta <= 0 : delta >= 0;
  const dateLabel = new Date(Date.parse(`${data.range.to}T12:00:00Z`) - 86_400_000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const download = () => { const csv = `period,metric,value\r\n${data.previousRange.from} to ${data.previousRange.to},${item.title},${previous}\r\n${data.range.from} to ${data.range.to},${item.title},${current}\r\n`; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`; a.click(); URL.revokeObjectURL(a.href); };
  return <div className="mb-kpi-card" data-guide={`mb-kpi-${item.metric}`}><div className="mb-kpi-head"><strong>{item.title}</strong><Dropdown.Root><Dropdown.Trigger aria-label={`Actions for ${item.title}`}><MoreHorizontal size={16}/></Dropdown.Trigger><Dropdown.Portal container={portalContainer}><Dropdown.Content className="mb-menu"><Dropdown.Item className="mb-menu-item" onSelect={() => setModal("table")}>View as table</Dropdown.Item><Dropdown.Item className="mb-menu-item" onSelect={download}>Download CSV</Dropdown.Item><Dropdown.Item className="mb-menu-item" onSelect={() => setModal("full")}>Fullscreen</Dropdown.Item></Dropdown.Content></Dropdown.Portal></Dropdown.Root></div><div className="mb-kpi-value">{formatMb(current, item.kind)}</div><div className="mb-kpi-foot"><span>{dateLabel}</span><span><b className={favorable ? "good" : "bad"}>{delta >= 0 ? "↑" : "↓"} {formatMb(Math.abs(delta), "percent")}</b> vs. Previous Period: {formatMb(previous, item.kind)}</span></div>
    <Dialog.Root open={modal !== null} onOpenChange={open => !open && setModal(null)}><Dialog.Portal container={portalContainer}><Dialog.Overlay className="mb-modal-overlay"/><Dialog.Content className="mb-modal mb-info-modal"><Dialog.Title>{item.title}</Dialog.Title><Dialog.Close className="mb-modal-close" aria-label="Close"><X size={18}/></Dialog.Close>{modal === "table" ? <div className="mb-table-scroll"><table><thead><tr><th>Period</th><th>Value</th></tr></thead><tbody><tr><td>{data.previousRange.from} – {data.previousRange.to}</td><td>{formatMb(previous, item.kind)}</td></tr><tr><td>{data.range.from} – {data.range.to}</td><td>{formatMb(current, item.kind)}</td></tr></tbody></table></div> : <div className="mb-kpi-full"><strong>{formatMb(current, item.kind)}</strong><span>{dateLabel}</span><span className={favorable ? "good" : "bad"}>{delta >= 0 ? "↑" : "↓"} {formatMb(Math.abs(delta), "percent")} vs. Previous Period</span></div>}</Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
function GrowthCharts({ data, pipelineData }: { data: MbData; pipelineData: MbData }) {
  return <><h2>Users</h2><MetabaseCard title="User Acquisition and Users to Leads CVR" kind="users" data={data} initialMetric="users" />
    <h2>Leads</h2><div className="mb-chart-grid"><MetabaseCard title="Leads | Browse Pages" kind="leads" data={data} initialMetric="usersToLeads"/><MetabaseCard title="Request Visits" kind="leads" data={data} initialMetric="visits"/></div>
    <h2>Leads Atribuidos</h2><div className="mb-chart-grid"><MetabaseCard title="Leads Atribuidos" kind="leads" data={data} initialMetric="attributedLeads"/><MetabaseCard title="Agent Source" kind="agents" data={data}/></div>
    <h2>Proyectos</h2><div className="mb-chart-grid"><MetabaseCard title="Acuerdo Puente by Priority" kind="priority" data={data}/><MetabaseCard title="Cancellation Reasons" kind="cancel" data={data}/></div>
    <div className="mb-chart-grid"><MetabaseCard title="Cohorts by Priority" kind="priority" priorityMetric="projects" data={data}/><MetabaseCard title="High Priority Cancellation Reasons" kind="cancel" cancellationGroup="high" data={data}/></div>
    <div className="mb-chart-grid"><MetabaseCard title="Rolling Projects" kind="priority" priorityMetric="visits" data={data}/><MetabaseCard title="Standard Cancellation Reasons" kind="cancel" cancellationGroup="standard" data={data}/></div>
    <h2>Revenue</h2><MetabaseCard title="Projects, Expected Revenue and Gross Commission" kind="revenue" data={data} initialMetric="revenue"/>
    <h2>Pipeline</h2><MetabaseCard title="Daily Pipeline" kind="pipeline" data={pipelineData}/><MetabaseCard title="Commission Open Pipeline" kind="commission" data={pipelineData}/></>;
}
function OtherTab({ tab, data }: { tab: "supply" | "dev"; data: MbData }) {
  return <><h2>{tab === "supply" ? "Supply" : "Development"}</h2><div className="mb-chart-grid"><MetabaseCard title={tab === "supply" ? "Projects by Priority" : "User Acquisition"} kind={tab === "supply" ? "priority" : "users"} data={data} initialMetric="users"/><MetabaseCard title={tab === "supply" ? "Agent Sources" : "Leads"} kind={tab === "supply" ? "agents" : "leads"} data={data} initialMetric="leads"/></div><div className="mb-chart-grid"><MetabaseCard title="Expected Revenue" kind="revenue" data={data} initialMetric="revenue"/><MetabaseCard title="Daily Pipeline" kind="pipeline" data={data}/></div></>;
}
export function MetabaseChrome() {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useQueryStates(parsers, { history: "push", shallow: true });
  const [dataset, setDataset] = useState<Dataset | null>(null); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const [infoOpen, setInfoOpen] = useState(false); const [saved, setSaved] = useState(false);
  const setStoreFilters = useMetabaseStore(state => state.setFilters);
  useEffect(() => { void getClientDataset().then(setDataset).catch(e => setError(String(e))); }, []);
  useEffect(() => { setStoreFilters(filters as MetabaseFilters); }, [filters, setStoreFilters]);
  const update = (patch: Partial<MetabaseFilters>) => { setBusy(true); void setFilters(patch); };
  useEffect(() => { if (!busy) return; const timer = window.setTimeout(() => setBusy(false), 190); return () => window.clearTimeout(timer); }, [busy, filters]);
  const data = useMemo(() => dataset ? buildMetabaseData(dataset, filters as MetabaseFilters) : null, [dataset, filters]);
  const organicData = useMemo(() => dataset ? buildMetabaseData(dataset, { ...filters, traffic: "", campaign: "", channel: "Organic Search" } as MetabaseFilters) : null, [dataset, filters]);
  const pipelineData = useMemo(() => dataset ? buildMetabaseData(dataset, { ...filters, traffic: "", campaign: "", channel: "", entryPoint: "" } as MetabaseFilters) : null, [dataset, filters]);
  const kpis = filters.tab === "growth" ? growthKpis : filters.tab === "supply" ? supplyKpis : devKpis;
  const share = () => void navigator.clipboard.writeText(window.location.href).then(() => setSaved(true));
  return <div data-app="metabase" className="mb-app" data-filters={JSON.stringify(filters)} ref={setPortalContainer}><AppPortalContainer container={portalContainer}><div className="mb-top"><div className="mb-container"><div className="mb-title-row"><h1>Growth Full Picture</h1><div className="mb-actions"><Unavailable><button aria-label="Edit dashboard"><Pencil size={16}/></button></Unavailable><button title="Copy link" aria-label="Share dashboard" onClick={share}><Share2 size={16}/></button><Unavailable><button aria-label="History"><Clock3 size={16}/></button></Unavailable><span/><button title={saved ? "Saved" : "Save view"} aria-label="Save view" onClick={() => { localStorage.setItem("metabase-saved-view", window.location.href); setSaved(true); }}><Bookmark size={16} fill={saved ? "currentColor" : "none"}/></button><button title="About this dashboard" aria-label="About dashboard" onClick={() => setInfoOpen(true)}><Info size={16}/></button><Dropdown.Root><Dropdown.Trigger aria-label="Dashboard actions"><MoreHorizontal size={18}/></Dropdown.Trigger><Dropdown.Portal container={portalContainer}><Dropdown.Content className="mb-menu"><Dropdown.Item className="mb-menu-item" onSelect={() => void setFilters(defaultMetabaseFilters)}><RotateCcw size={14}/>Reset filters</Dropdown.Item><Dropdown.Item className="mb-menu-item" onSelect={share}><Share2 size={14}/>Copy link</Dropdown.Item></Dropdown.Content></Dropdown.Portal></Dropdown.Root></div></div><nav className="mb-tabs" aria-label="Dashboard tabs">{(["growth", "supply", "dev"] as const).map(tab => <button key={tab} className={filters.tab === tab ? "active" : ""} onClick={() => update({ tab })}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav></div></div>
    <main className="mb-container mb-main"><MetabaseFilterBar filters={filters as MetabaseFilters} update={update}/>{error ? <div role="alert">Unable to load synthetic data: {error}</div> : !data ? <div className="mb-loading">Loading dashboard…</div> : <div className={busy ? "mb-content mb-busy" : "mb-content"}><div className="mb-kpis">{kpis.slice(0, 4).map(item => <KpiCard key={item.title} item={item} data={data}/>)}</div>{kpis.length > 4 && <div className="mb-kpis mb-kpis-three">{kpis.slice(4).map(item => <KpiCard key={item.title} item={item} data={item.metric === "organic" && organicData ? organicData : data}/>)}</div>}{filters.tab === "growth" ? <GrowthCharts data={data} pipelineData={pipelineData ?? data}/> : <OtherTab tab={filters.tab} data={data}/>}</div>}</main>
    <Dialog.Root open={infoOpen} onOpenChange={setInfoOpen}><Dialog.Portal container={portalContainer}><Dialog.Overlay className="mb-modal-overlay"/><Dialog.Content className="mb-modal mb-info-modal"><Dialog.Title>Growth Full Picture</Dialog.Title><Dialog.Close className="mb-modal-close" aria-label="Close"><X size={18}/></Dialog.Close><p>Training dashboard for acquisition, leads, projects, revenue and pipeline. All data is synthetic.</p><p>Use filters above to investigate each segment. Changes are saved in the URL.</p></Dialog.Content></Dialog.Portal></Dialog.Root><CaseDock/><AppSwitcher/><SimulatorBadge/>
  </AppPortalContainer></div>;
}
