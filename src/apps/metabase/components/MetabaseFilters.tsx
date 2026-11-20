"use client";
import { useAppPortalContainer } from "@/components/shared/AppPortalContainer";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Checkbox from "@radix-ui/react-checkbox";
import { CalendarDays, Check, ChevronDown, Clock3, Type, X } from "lucide-react";
import type { MetabaseFilters } from "../dashboard-data";
import { AGENT_SOURCES, CAMPAIGNS, CHANNELS, ENTRY_POINTS, EVENTS, LEAD_TYPES, PRIORITIES, SECTORS, SOURCE_MEDIUM } from "@/data/universe";

type FilterKey = keyof MetabaseFilters;
interface Definition { key: FilterKey; label: string; options?: readonly string[]; kind?: "date"; multi?: boolean; }
const sources = [...new Set(Object.values(SOURCE_MEDIUM).map(([source]) => source))];
const campaigns = [...new Set(Object.values(CAMPAIGNS))];
const filterRows: Definition[][] = [
  [{ key: "grouping", label: "Time grouping", options: ["Day", "Week", "Month"] }, { key: "datePreset", label: "Date Picker", kind: "date" }, { key: "leadType", label: "Lead Type (Max)", options: LEAD_TYPES, multi: true }, { key: "sector", label: "Sector", options: SECTORS, multi: true }],
  [{ key: "comparison", label: "Comparison Type", options: ["Month over Month", "Previous period"] }, { key: "cohort", label: "Cohort Type", options: ["Nuevo", "Recurrente"] }, { key: "channel", label: "Channel", options: CHANNELS, multi: true }, { key: "traffic", label: "Traffic Type", options: ["Paid", "Organic", "Direct"] }, { key: "campaign", label: "Campaign Name", options: campaigns, multi: true }],
  [{ key: "priority", label: "Priority", options: PRIORITIES, multi: true }, { key: "bridge", label: "A. Puente Category", options: ["Priority", "Standard"] }, { key: "entryPoint", label: "Entry Point", options: ENTRY_POINTS, multi: true }, { key: "suspicious", label: "User Sospechoso", options: ["0", "1", "All", "excludeAll"] }, { key: "role", label: "User Industria Role", options: ["Business", "Industrial"], multi: true }],
  [{ key: "cta", label: "CTAs", options: EVENTS.filter(e => e.startsWith("clientClicked") || e.startsWith("clientRequested")), multi: true }, { key: "visitOrigin", label: "Origen de visita", options: sources, multi: true }, { key: "visitStatus", label: "Estatus de visita", options: ["open", "cancelled", "won"], multi: true }, { key: "agentSource", label: "Agent Source", options: AGENT_SOURCES, multi: true }, { key: "spotState", label: "Spot State", options: ["Available", "Not viewed"], multi: true }],
];
function displayValue(def: Definition, f: MetabaseFilters) {
  if (def.kind === "date") return f.datePreset === "custom" ? f.from && f.to ? `${f.from} – ${f.to}` : "Specific dates" : f.datePreset === "thisMonth" ? "This month" : `Previous ${f.dateAmount} ${f.datePreset === "days" ? "days" : f.datePreset === "weeks" ? "weeks" : "months or this month"}`;
  const value = String(f[def.key] ?? "");
  return value === "excludeAll" ? "Exclude all" : value.includes("|") ? `${value.split("|").length} selections` : value;
}
function DatePicker({ filters: f, update }: { filters: MetabaseFilters; update: (patch: Partial<MetabaseFilters>) => void }) {
  return <div className="mb-date-panel"><div className="mb-pop-title">Date Picker</div>
    <button className={f.datePreset === "thisMonth" ? "selected" : ""} onClick={() => update({ datePreset: "thisMonth" })}>This month</button>
    <button className={f.datePreset !== "custom" && f.datePreset !== "thisMonth" ? "selected" : ""} onClick={() => update({ datePreset: "previous" })}>Previous</button>
    <div className="mb-date-inputs"><input aria-label="Number of units" type="number" min={1} max={180} value={f.dateAmount} onChange={event => update({ dateAmount: Math.max(1, Number(event.target.value)) })} /><select aria-label="Date unit" value={f.datePreset === "days" || f.datePreset === "weeks" ? f.datePreset : "previous"} onChange={event => update({ datePreset: event.target.value })}><option value="days">days</option><option value="weeks">weeks</option><option value="previous">months</option></select></div>
    <button className={f.datePreset === "custom" ? "selected" : ""} onClick={() => update({ datePreset: "custom" })}>Specific dates</button>
    <div className="mb-date-inputs"><input aria-label="From date" type="date" value={f.from} onChange={event => update({ datePreset: "custom", from: event.target.value })} /><input aria-label="To date" type="date" value={f.to} onChange={event => update({ datePreset: "custom", to: event.target.value })} /></div>
  </div>;
}
function FilterChip({ def, filters, update }: { def: Definition; filters: MetabaseFilters; update: (patch: Partial<MetabaseFilters>) => void }) {
  const portalContainer = useAppPortalContainer();
  const [search, setSearch] = useState(""); const [open, setOpen] = useState(false);
  const value = displayValue(def, filters);
  const isDefault = def.key === "grouping" || def.key === "comparison" || def.key === "suspicious" || def.kind === "date";
  const options = def.options?.filter(option => option.toLowerCase().includes(search.toLowerCase())) ?? [];
  const setValue = (selected: string) => { update({ [def.key]: selected } as Partial<MetabaseFilters>); setOpen(false); };
  const selected = String(filters[def.key] ?? "").split("|").filter(Boolean);
  const toggle = (option: string) => update({ [def.key]: selected.includes(option) ? selected.filter(value => value !== option).join("|") : [...selected, option].join("|") } as Partial<MetabaseFilters>);
  return <Popover.Root open={open} onOpenChange={setOpen}><div className="mb-filter-wrap"><Popover.Trigger asChild><button className="mb-filter" aria-label={`${def.label}${value ? `: ${value}` : ""}`}>{def.key === "grouping" ? <Clock3 size={13}/> : def.kind === "date" ? <CalendarDays size={13}/> : <Type size={13} />}<span>{def.label}{value && <>: <b>{value}</b></>}</span>{(!value || isDefault) && <ChevronDown size={13} className="mb-chip-end" />}</button></Popover.Trigger>{value && !isDefault && <button className="mb-filter-clear" aria-label={`Clear ${def.label}`} onClick={() => update({ [def.key]: "" } as Partial<MetabaseFilters>)}><X size={12} /></button>}</div>
    <Popover.Portal container={portalContainer}><Popover.Content className="mb-popover" sideOffset={5} align="start" collisionPadding={12}>{def.kind === "date" ? <DatePicker filters={filters} update={update} /> : <><div className="mb-pop-title">{def.label}</div>{(def.options?.length ?? 0) > 6 && <input className="mb-pop-search" placeholder="Search..." value={search} onChange={event => setSearch(event.target.value)} />}
      <div className="mb-pop-options">{!isDefault && <button onClick={() => { update({ [def.key]: "" } as Partial<MetabaseFilters>); if (!def.multi) setOpen(false); }} className={!value ? "selected" : ""}><span className="mb-checkbox">{!value && <Check size={11}/>}</span>All</button>}{options.map(option => def.multi ? <label key={option} title={option} className={selected.includes(option) ? "selected" : ""}><Checkbox.Root className="mb-checkbox" checked={selected.includes(option)} onCheckedChange={() => toggle(option)} aria-label={option}><Checkbox.Indicator><Check size={11}/></Checkbox.Indicator></Checkbox.Root><span>{option}</span></label> : <button key={option} title={option} onClick={() => setValue(option)} className={value === option ? "selected" : ""}><span className="mb-checkbox">{value === option && <Check size={11}/>}</span>{option === "excludeAll" ? "Exclude all" : option}</button>)}{options.length === 0 && <span className="mb-pop-empty">No values found</span>}</div></>}<Popover.Close className="mb-pop-close" aria-label="Close"><X size={14}/></Popover.Close></Popover.Content></Popover.Portal>
  </Popover.Root>;
}
export function MetabaseFilterBar({ filters, update }: { filters: MetabaseFilters; update: (patch: Partial<MetabaseFilters>) => void }) {
  return <div className="mb-filters" aria-label="Dashboard filters">{filterRows.map((row, index) => <div className="mb-filter-row" key={index}>{row.map(def => <FilterChip key={def.key} def={def} filters={filters} update={update}/>)}</div>)}<span className="mb-filter-calendar"><CalendarDays size={15}/></span></div>;
}
