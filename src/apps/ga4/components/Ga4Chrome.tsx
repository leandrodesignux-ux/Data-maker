"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { BarChart3, ChartNoAxesCombined, ChevronDown, ChevronRight, CircleHelp, Compass, Grid2X2, Home, Info, Menu, Search, Settings, Share2, SlidersHorizontal, X } from "lucide-react";
import type { Dataset } from "@/data/model";
import { getClientDataset } from "@/data/client";
import { AppSwitcher } from "@/components/shared/AppSwitcher";
import { SimulatorBadge } from "@/components/shared/SimulatorBadge";
import { CaseDock } from "@/components/shared/CaseDock";
import { Ga4ReportBar } from "./Ga4Controls";
import { Ga4Report, type GaReportKind } from "./Ga4Report";
import { Ga4Detail } from "./Ga4Detail";
import { Ga4Exploration } from "./Ga4Exploration";
import { defaultGaFilters, type GaFilters, type GaDimension, type GaGrain } from "../ga4-data";
import { useGa4Store } from "../store";
import "../chrome.css";
import "../dashboard.css";
import "../explore.css";

const routes = [
  { label: "Informe panorámico", href: "/ga4/informes/panoramico" },
  { label: "Adquisición de tráfico", href: "/ga4/informes/adquisicion-trafico" },
  { label: "Eventos", href: "/ga4/informes/eventos" },
  { label: "Páginas y pantallas", href: "/ga4/informes/paginas" },
  { label: "Exploración de embudo", href: "/ga4/explorar/embudo" },
];
const parsers = {
  datePreset: parseAsString.withDefault(defaultGaFilters.datePreset), from: parseAsString.withDefault(""), to: parseAsString.withDefault(""),
  comparePeriod: parseAsBoolean.withDefault(false), grain: parseAsString.withDefault("day"), segmentDimension: parseAsString.withDefault(""), segmentValue: parseAsString.withDefault(""),
  conditions: parseAsString.withDefault(""), dimension: parseAsString.withDefault("channel"), secondary: parseAsString.withDefault(""),
  steps: parseAsString.withDefault(""), breakdown: parseAsString.withDefault("none"), openFunnel: parseAsBoolean.withDefault(false), tab: parseAsString.withDefault("1"),
};
function Rail({ explore }: { explore: boolean }) {
  const params = useSearchParams(), caseParam = params.get("case");
  const href = (path: string) => caseParam ? `${path}?case=${encodeURIComponent(caseParam)}` : path;
  return <div className="ga-rail"><Link href={href("/ga4/informes/panoramico")} title="Inicio"><Home size={21}/></Link><Link href={href("/ga4/informes/eventos")} className={!explore ? "active" : ""} title="Informes"><BarChart3 size={21}/></Link><Link href={href("/ga4/explorar/embudo")} className={explore ? "active" : ""} title="Explorar"><ChartNoAxesCombined size={21}/></Link><button title="No disponible en el simulador"><Compass size={21}/></button><button className="ga-settings" title="No disponible en el simulador"><Settings size={21}/></button></div>;
}
function Sidebar({ path }: { path: string }) {
  const params = useSearchParams(), caseParam = params.get("case");
  const [open, setOpen] = useState({ ciclo: true, adquisicion: false, interaccion: true, objetivos: true, search: true });
  const toggle = (key: keyof typeof open) => setOpen(value => ({ ...value, [key]: !value[key] }));
  const item = (label: string, href?: string, depth = 0) => href ? <Link key={label} href={caseParam ? `${href}?case=${encodeURIComponent(caseParam)}` : href} className={`ga-side-item depth-${depth} ${path === href || path.startsWith(href + "/") ? "active" : ""}`}>{label}</Link> : <button key={label} className={`ga-side-item depth-${depth}`} title="No disponible en el simulador">{label}</button>;
  return <aside className="ga-sidebar"><div className="ga-sidebar-scroll">{item("Informe panorámico", routes[0].href)}{item("Resumen en tiempo real")}{item("Páginas en tiempo real")}
    <button className="ga-side-group" onClick={() => toggle("ciclo")}>{open.ciclo ? <ChevronDown size={15}/> : <ChevronRight size={15}/>} Ciclo de vida</button>
    {open.ciclo && <><button className="ga-side-subgroup" onClick={() => toggle("adquisicion")}>{open.adquisicion ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} Adquisición</button>{open.adquisicion && <>{item("Resumen de adquisición", undefined, 2)}{item("Adquisición de usuarios", undefined, 2)}{item("Adquisición de tráfico", routes[1].href, 2)}</>}
      <button className="ga-side-subgroup" onClick={() => toggle("interaccion")}>{open.interaccion ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} Interacción</button>{open.interaccion && <>{item("Resumen de interacción", undefined, 2)}{item("Eventos", routes[2].href, 2)}{item("Páginas y pantallas", routes[3].href, 2)}</>}{item("Monetización", undefined, 1)}{item("Retención", undefined, 1)}</>}
    <button className="ga-side-group" onClick={() => toggle("objetivos")}>{open.objetivos ? <ChevronDown size={15}/> : <ChevronRight size={15}/>} Objetivos de negocio</button>{open.objetivos && <>{item("Generar oportunidades de venta", undefined, 1)}{item("Generar ventas", undefined, 1)}{item("Conocer el tráfico web", undefined, 1)}</>}
    <button className="ga-side-group" onClick={() => toggle("search")}>{open.search ? <ChevronDown size={15}/> : <ChevronRight size={15}/>} Search Console</button>{open.search && item("Consultas", undefined, 1)}</div></aside>;
}
export function Ga4Chrome() {
  const path = usePathname(), router = useRouter(), searchParams = useSearchParams();
  const [query, setQuery] = useQueryStates(parsers, { history: "push", shallow: true });
  const filters: GaFilters = useMemo(() => ({ datePreset: query.datePreset, from: query.from, to: query.to, comparePeriod: query.comparePeriod, grain: query.grain as GaGrain, segmentDimension: query.segmentDimension as GaFilters["segmentDimension"], segmentValue: query.segmentValue, conditions: query.conditions, dimension: query.dimension as GaDimension, secondary: query.secondary as GaFilters["secondary"] }), [query]);
  const setFilters = useGa4Store(s => s.setFilters);
  const [dataset, setDataset] = useState<Dataset | null>(null), [error, setError] = useState(""), [banner, setBanner] = useState(true), [search, setSearch] = useState(""), [searchFocus, setSearchFocus] = useState(false), [propertyOpen, setPropertyOpen] = useState(false), [loading, setLoading] = useState(false);
  const explore = path.startsWith("/ga4/explorar"), detail = path.startsWith("/ga4/informes/eventos/");
  const title = detail ? decodeURIComponent(path.split("/").at(-1) ?? "Evento") : path.endsWith("panoramico") ? "Informe panorámico" : path.endsWith("adquisicion-trafico") ? "Adquisición de tráfico" : path.endsWith("paginas") ? "Páginas y pantallas" : "Eventos: Nombre del evento";
  const kind: GaReportKind = path.endsWith("panoramico") ? "overview" : path.endsWith("adquisicion-trafico") ? "traffic" : path.endsWith("paginas") ? "pages" : "events";
  const update = (patch: Partial<GaFilters>) => { void setQuery(patch); setLoading(true); window.setTimeout(() => setLoading(false), 200); };
  useEffect(() => { getClientDataset().then(setDataset).catch(e => setError(String(e))); }, []);
  useEffect(() => { setFilters(filters); }, [filters, setFilters]);
  useEffect(() => {
    const caseId = searchParams.get("case");
    if (caseId === "GA-01" && !searchParams.has("conditions")) void setQuery({ conditions: JSON.stringify([{ dimension: "channel", operator: "equals", value: "Organic Search" }, { dimension: "sector", operator: "equals", value: "Oficinas" }, { dimension: "entryPoint", operator: "equals", value: "Browse Page" }]), datePreset: "90d" });
    if (caseId === "GA-02" && !searchParams.has("datePreset")) void setQuery({ datePreset: "month", dimension: "channel", comparePeriod: true });
    if (caseId === "GA-03" && !searchParams.has("datePreset")) void setQuery({ datePreset: "90d" });
  }, [searchParams, setQuery]);
  const suggestions = routes.filter(route => route.label.toLowerCase().includes(search.toLowerCase()));
  const caseHref = (href: string) => searchParams.get("case") ? `${href}?case=${encodeURIComponent(searchParams.get("case")!)}` : href;
  return <div data-app="ga4" className="ga-app">
    {banner && <div className="ga-banner"><Info size={18}/><span>Los datos de esta propiedad se están estimando para tener en cuenta factores como el consentimiento de cookies.</span><button onClick={() => setBanner(false)}>Ignorar</button><button title="No disponible en el simulador">Más información</button></div>}
    <header className="ga-header"><Link href={caseHref("/ga4/informes/panoramico")} className="ga-brand"><span className="ga-brand-mark"><i/><i/><i/></span><span>Analytics</span></Link><div className="ga-property-wrap"><button className="ga-property" onClick={() => setPropertyOpen(!propertyOpen)}><small>Cuenta de entrenamiento</small><span>Marketplace Demo - GA4 <ChevronDown size={16}/></span></button>{propertyOpen && <div className="ga-property-pop"><strong>Cuenta de entrenamiento</strong><button onClick={() => setPropertyOpen(false)}>Marketplace Demo - GA4</button></div>}</div><div className="ga-search-wrap"><div className="ga-search"><Search size={20}/><input value={search} onFocus={() => setSearchFocus(true)} onBlur={() => window.setTimeout(() => setSearchFocus(false), 150)} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && suggestions[0]) { router.push(caseHref(suggestions[0].href)); setSearchFocus(false); } }} placeholder="Pruebe a buscar informes o exploraciones" aria-label="Buscar informes"/>{search && <button onClick={() => setSearch("")} aria-label="Borrar búsqueda"><X size={16}/></button>}</div>{searchFocus && search && <div className="ga-search-results">{suggestions.length ? suggestions.map(route => <button key={route.href} onMouseDown={event => event.preventDefault()} onClick={() => { router.push(caseHref(route.href)); setSearchFocus(false); setSearch(""); }}><Search size={15}/>{route.label}</button>) : <span>Sin resultados</span>}</div>}</div><div className="ga-header-actions"><button title="No disponible en el simulador"><Grid2X2 size={20}/></button><button title="No disponible en el simulador"><CircleHelp size={20}/></button><span>D</span></div></header>
    <div className="ga-body"><Rail explore={explore}/>{explore ? <Ga4Exploration dataset={dataset} filters={filters} update={update} query={{ steps: query.steps, breakdown: query.breakdown, openFunnel: query.openFunnel, tab: query.tab }} setQuery={patch => { void setQuery(patch); }}/> : <><Sidebar path={path}/><main className="ga-report"><Ga4ReportBar filters={filters} update={update}/><div className="ga-title-line"><h1>{title}</h1><div><button title="No disponible en el simulador"><Menu size={19}/></button><button title="No disponible en el simulador"><SlidersHorizontal size={19}/></button><button title="No disponible en el simulador"><Share2 size={19}/></button></div></div><div className="ga-report-content">{error ? <div className="ga-error">{error}</div> : !dataset ? <div className="ga-skeleton"/> : <div className={loading ? "ga-content-loading" : ""}>{detail ? <Ga4Detail dataset={dataset} filters={filters} eventName={title} update={update}/> : <Ga4Report dataset={dataset} filters={filters} update={update} kind={kind} focusEvent={searchParams.get("case") === "GA-03" ? "clientRequestedWhatsappForm" : ""}/>}</div>}</div><footer className="ga-footer">© 2026 Google · Simulación de entrenamiento</footer></main></>}</div>
    <CaseDock/><AppSwitcher/><SimulatorBadge/>
  </div>;
}
