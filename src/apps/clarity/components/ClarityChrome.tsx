"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { CircleHelp, Flame, LayoutDashboard, Settings, Video } from "lucide-react";
import type { Dataset } from "@/data/model";
import { getClientDataset } from "@/data/client";
import { PAGES } from "@/data/universe";
import { AppSwitcher } from "@/components/shared/AppSwitcher";
import { SimulatorBadge } from "@/components/shared/SimulatorBadge";
import { CaseDock } from "@/components/shared/CaseDock";
import { AppPortalContainer } from "@/components/shared/AppPortalContainer";
import { ClarityControls } from "./ClarityControls";
import { ClarityPanel } from "./ClarityPanel";
import { ClarityHeatmaps } from "./ClarityHeatmaps";
import { defaultClFilters, type ClFilters } from "../clarity-data";
import { useClarityStore } from "../store";
import "../chrome.css";
import "../dashboard.css";
import "../heatmap.css";

const parsers = {
  datePreset: parseAsString.withDefault(defaultClFilters.datePreset), from: parseAsString.withDefault(""), to: parseAsString.withDefault(""),
  url: parseAsString.withDefault(""), urlOperator: parseAsString.withDefault("contains"), device: parseAsString.withDefault(""), browser: parseAsString.withDefault(""), os: parseAsString.withDefault(""), country: parseAsString.withDefault(""), channel: parseAsString.withDefault(""), campaign: parseAsString.withDefault(""), source: parseAsString.withDefault(""), referrer: parseAsString.withDefault(""), sector: parseAsString.withDefault(""), behavior: parseAsString.withDefault(""),
  page: parseAsString.withDefault(PAGES.spot), mode: parseAsString.withDefault("click"), clickKind: parseAsString.withDefault("all"), compare: parseAsBoolean.withDefault(false),
  compareDevice: parseAsString.withDefault("mobile"), compareDatePreset: parseAsString.withDefault("7d"), compareFrom: parseAsString.withDefault(""), compareTo: parseAsString.withDefault(""), compareBrowser: parseAsString.withDefault(""), compareBehavior: parseAsString.withDefault(""),
};
function DisabledNav({ label, Icon }: { label: string; Icon: typeof Video }) { return <span title="No disponible en el simulador"><button disabled><Icon size={18}/>{label}</button></span>; }
export function ClarityChrome() {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const path = usePathname(), params = useSearchParams(), heatmap = path.includes("mapas-termicos"), recordings = path.includes("grabaciones");
  const [query, setQuery] = useQueryStates(parsers, { history: "push", shallow: true });
  const filters: ClFilters = useMemo(() => ({
    datePreset: query.datePreset, from: query.from, to: query.to, url: query.url, urlOperator: query.urlOperator as ClFilters["urlOperator"], device: query.device as ClFilters["device"], browser: query.browser, os: query.os, country: query.country, channel: query.channel, campaign: query.campaign, source: query.source, referrer: query.referrer, sector: query.sector, behavior: query.behavior as ClFilters["behavior"],
    page: query.page, mode: query.mode as ClFilters["mode"], clickKind: query.clickKind as ClFilters["clickKind"], compare: query.compare, compareDevice: query.compareDevice as ClFilters["compareDevice"], compareDatePreset: query.compareDatePreset, compareFrom: query.compareFrom, compareTo: query.compareTo, compareBrowser: query.compareBrowser, compareBehavior: query.compareBehavior as ClFilters["compareBehavior"],
  }), [query]);
  const setFilters = useClarityStore(s => s.setFilters);
  const [dataset, setDataset] = useState<Dataset | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const update = (patch: Partial<ClFilters>) => { void setQuery(patch); setLoading(true); window.setTimeout(() => setLoading(false), 200); };
  useEffect(() => { getClientDataset().then(setDataset).catch(e => setError(String(e))); }, []);
  useEffect(() => { setFilters(filters); }, [filters, setFilters]);
  const currentHref = (target: string) => `${target}?${params.toString()}`;
  return <div data-app="clarity" className="cl-app" data-filters={JSON.stringify(filters)} ref={setPortalContainer}><AppPortalContainer container={portalContainer}><header className="cl-header"><div className="cl-brand"><span className="cl-ms-mark"><i/><i/><i/><i/></span><span>Microsoft</span><strong>Clarity</strong><button title="Proyecto de entrenamiento">Marketplace Demo ▾</button></div><nav className="cl-topnav" aria-label="Navegación de Clarity"><Link href={currentHref("/clarity/panel")} className={!heatmap && !recordings ? "active" : ""}><LayoutDashboard size={18}/>Panel</Link><DisabledNav label="Grabaciones" Icon={Video}/><Link href={currentHref("/clarity/mapas-termicos")} className={heatmap ? "active" : ""}><Flame size={18}/>Mapas Térmicos</Link><DisabledNav label="Configuración" Icon={Settings}/></nav><div className="cl-header-end"><button title="No disponible en el simulador"><CircleHelp size={18}/></button><span>D</span></div></header>
    {!heatmap && <div className="cl-subnav"><button className="active">Información general</button><span title="No disponible en el simulador"><button disabled>Google Analytics</button></span><span title="No disponible en el simulador"><button disabled>Visibilidad de AI</button></span></div>}
    <ClarityControls filters={filters} update={update}/>
    <main className={heatmap ? "cl-main cl-main-heat" : "cl-main"}>{error ? <div className="cl-error">{error}</div> : !dataset ? <div className="cl-skeleton"/> : <div className={loading ? "cl-loading" : ""}>{heatmap ? <ClarityHeatmaps dataset={dataset} filters={filters} update={update}/> : recordings ? <div className="cl-unavailable">No disponible en el simulador</div> : <ClarityPanel dataset={dataset} filters={filters}/>}</div>}</main><CaseDock/><AppSwitcher/><SimulatorBadge/>
  </AppPortalContainer></div>;
}
