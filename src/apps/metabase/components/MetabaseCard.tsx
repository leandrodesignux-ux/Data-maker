"use client";
import { useAppPortalContainer } from "@/components/shared/AppPortalContainer";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronDown, Download, Expand, MoreHorizontal, Table2, X } from "lucide-react";
import type { EChartsOption } from "echarts";
import { metabaseEchartsTheme } from "../echarts-theme";
import { cancellationOrder, formatMb, mbValue, priorityOrder, type MbBucket, type MbData, type MbMetric } from "../dashboard-data";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
const axis = { axisLine: { lineStyle: { color: "#425361" } }, axisTick: { show: false }, axisLabel: { color: "#aab8c1", fontSize: 11 }, splitLine: { lineStyle: { color: "#263743", type: "dashed" as const } } };
const colors = ["#4da3e6", "#ead6a4", "#eac53a", "#f5a2a3", "#e45f68", "#a784b4"];
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const periodLabel = (period: string) => period.slice(5).replace("-", "/");
type ChartKind = "users" | "leads" | "agents" | "priority" | "cancel" | "revenue" | "pipeline" | "commission";
const metricChoices: Partial<Record<ChartKind, { label: string; value: MbMetric }[]>> = {
  users: [{ label: "Users", value: "users" }, { label: "Sessions", value: "sessions" }, { label: "Organic Search Traffic", value: "organic" }],
  leads: [{ label: "Users to Leads CVR", value: "usersToLeads" }, { label: "Leads", value: "leads" }, { label: "Attributed Leads", value: "attributedLeads" }, { label: "Request Visits", value: "visits" }],
  revenue: [{ label: "Expected Revenue", value: "revenue" }, { label: "Gross Commission", value: "commission" }],
};

function optionsFor(kind: ChartKind, rows: MbBucket[], metric: MbMetric, showAllReasons = false, priorityMetric: "leads" | "projects" | "visits" = "leads", cancellationGroup: "all" | "high" | "standard" = "all"): EChartsOption {
  const periods = rows.map(row => periodLabel(row.period));
  const base: EChartsOption = {
    backgroundColor: "transparent", color: colors,
    animationDuration: 350,
    grid: { top: kind === "cancel" ? 34 : 42, right: kind === "cancel" ? 119 : 44, left: kind === "cancel" ? 33 : 54, bottom: kind === "pipeline" || kind === "commission" ? 86 : 56, containLabel: false },
    tooltip: { trigger: "axis", backgroundColor: "#102431", borderColor: "#526575", textStyle: { color: "#e9eff2" }, valueFormatter: value => nf.format(Number(value)) },
    legend: kind === "users" ? { top: 0, left: 4, textStyle: { color: "#b8c6cf", fontSize: 10 }, icon: "circle", itemWidth: 8, itemHeight: 8 } : kind === "priority" || kind === "agents" || kind === "pipeline" || kind === "commission" || kind === "revenue" ? { bottom: 3, textStyle: { color: "#b8c6cf", fontSize: 10 }, icon: "roundRect", itemWidth: 12, itemHeight: 8 } : undefined,
    xAxis: { type: "category", data: periods, ...axis, axisLabel: { color: "#aab8c1", fontSize: 11, interval: kind === "cancel" ? 3 : kind === "pipeline" || kind === "commission" ? 13 : "auto", rotate: kind === "pipeline" || kind === "commission" ? 45 : 0 }, splitLine: { show: false } },
    yAxis: { type: "value", ...axis, axisLabel: { color: "#aab8c1", fontSize: 11, formatter: (value: number) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value) } },
  };
  const bars = (name: string, data: number[], color: string, stack?: string) => ({ name, type: "bar" as const, data, stack, barMaxWidth: stack === "pipeline" ? 8 : 30, itemStyle: { color }, emphasis: { focus: "series" as const }, label: { show: !stack && rows.length <= 16, position: "top" as const, color: "#e8eff3", fontSize: 10, formatter: (item: { value?: unknown }) => nf.format(Number(item.value ?? 0)) } });
  const line = (name: string, data: number[], color: string, yAxisIndex = 0, percent = false) => ({ name, type: "line" as const, data, yAxisIndex, smooth: 0.18, symbol: "circle", symbolSize: 6, lineStyle: { color, width: 2 }, itemStyle: { color }, label: { show: rows.length <= 16, position: "top" as const, color: "#e8eff3", fontSize: 10, formatter: (item: { value?: unknown }) => percent ? `${Number(item.value ?? 0).toFixed(2)}%` : nf.format(Number(item.value ?? 0)) } });
  if (kind === "users") {
    base.series = [bars(metric === "organic" ? "Organic Search Traffic" : metric === "sessions" ? "Sessions" : "Users", rows.map(row => mbValue(row, metric)), "#4da3e6"), line("Users to Leads CVR", rows.map(row => mbValue(row, "usersToLeads")), "#f0cc43", 1, true), line("Bounce Rate", rows.map(row => mbValue(row, "bounceRate")), "#5f93c6", 1, true)];
    base.yAxis = [base.yAxis as object, { type: "value", min: 0, axisLabel: { color: "#aab8c1", formatter: "{value}%" }, splitLine: { show: false } }];
  } else if (kind === "leads") {
    base.series = [bars("Leads", rows.map(row => row.leads), "#4da3e6"), line(metric === "visits" ? "Request Visits" : metric === "usersToLeads" ? "Users to Leads CVR" : metric === "attributedLeads" ? "Attributed Leads" : "Leads", rows.map(row => mbValue(row, metric)), "#f0cc43", metric === "usersToLeads" ? 1 : 0, metric === "usersToLeads")];
    if (metric === "usersToLeads") base.yAxis = [base.yAxis as object, { type: "value", axisLabel: { color: "#aab8c1", formatter: "{value}%" }, splitLine: { show: false } }];
  } else if (kind === "priority") base.series = priorityOrder.map((priority, index) => bars(priority, rows.map(row => (priorityMetric === "projects" ? row.projectPriorities : priorityMetric === "visits" ? row.visitPriorities : row.priorities)[priority] ?? 0), colors[index], "priority"));
  else if (kind === "agents") base.series = ["CREX", "NEXT", "VIRTUAL"].map((agent, index) => bars(agent, rows.map(row => row.agents[agent] ?? 0), colors[index], "agents"));
  else if (kind === "cancel") {
    base.legend = { data: cancellationOrder.slice(0, showAllReasons ? undefined : 4), orient: "vertical", right: 5, top: 32, textStyle: { color: "#b8c6cf", fontSize: 10 }, itemWidth: 12, itemHeight: 7, formatter: (name: string) => name.length > 18 ? `${name.slice(0, 17)}…` : name };
    base.series = cancellationOrder.map((reason, index) => ({ ...line(reason, rows.map(row => (cancellationGroup === "high" ? row.highPriorityCancellations : cancellationGroup === "standard" ? row.standardCancellations : row.cancellations)[reason] ?? 0), colors[index % colors.length]), label: { show: index === 0 && rows.length <= 16, color: "#e8eff3", fontSize: 10 } }));
  } else if (kind === "revenue") {
    base.series = [bars("Projects", rows.map(row => row.projects), "#4da3e6"), line("Expected Revenue", rows.map(row => row.revenue), "#f0cc43", 1), line("Gross Commission", rows.map(row => row.commission), "#79c5bc", 1), { name: "Target $2M", type: "line", data: rows.map(() => 2_000_000), yAxisIndex: 1, symbol: "none", lineStyle: { color: "#f7dd74", type: "dashed", width: 1 }, itemStyle: { color: "#f7dd74" } }];
    base.yAxis = [base.yAxis as object, { type: "value", axisLabel: { color: "#aab8c1", formatter: (value: number) => `$${(value / 1_000_000).toFixed(1)}M` }, splitLine: { show: false } }];
  } else if (kind === "pipeline" || kind === "commission") base.series = ["Contract", "Documentation", "Intention Letter"].map((stage, index) => bars(stage, rows.map(row => kind === "pipeline" ? row.pipeline[stage] ?? 0 : row.pipelineCommission[stage] ?? 0), ["#f5a2a3", "#ead6a4", "#ffe58c"][index], "pipeline"));
  return base;
}

function downloadCsv(title: string, rows: MbBucket[]) {
  const columns = ["period", "users", "sessions", "leads", "projects", "visits", "won", "revenue", "commission", "bounces", "organic", "bridge"] as const;
  const csv = [columns.join(","), ...rows.map(row => columns.map(column => row[column]).join(","))].join("\r\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`; link.click(); URL.revokeObjectURL(link.href);
}

export function MetabaseCard({ title, data, kind, initialMetric, priorityMetric, cancellationGroup, className = "" }: { title: string; data: MbData; kind: ChartKind; initialMetric?: MbMetric; priorityMetric?: "leads" | "projects" | "visits"; cancellationGroup?: "all" | "high" | "standard"; className?: string }) {
  const portalContainer = useAppPortalContainer();
  const [metric, setMetric] = useState<MbMetric>(initialMetric ?? "leads");
  const [modal, setModal] = useState<"table" | "full" | null>(null);
  const [showAllReasons, setShowAllReasons] = useState(false);
  const chartRows = kind === "pipeline" || kind === "commission" ? data.pipelineDaily : data.current;
  const options = useMemo(() => optionsFor(kind, chartRows, metric, showAllReasons, priorityMetric, cancellationGroup), [kind, chartRows, metric, showAllReasons, priorityMetric, cancellationGroup]);
  const choices = metricChoices[kind];
  return <div className={`mb-chart-card ${className}`} data-guide={`mb-chart-${kind}`}><div className="mb-card-head"><div className="mb-chart-title">{title}{choices && <Dropdown.Root><Dropdown.Trigger className="mb-metric-trigger">Metric: {choices.find(choice => choice.value === metric)?.label ?? choices[0].label}<ChevronDown size={12}/></Dropdown.Trigger><Dropdown.Portal container={portalContainer}><Dropdown.Content className="mb-menu" sideOffset={5}>{choices.map(choice => <Dropdown.Item className="mb-menu-item" key={choice.value} onSelect={() => setMetric(choice.value)}>{choice.label}{metric === choice.value && <Check size={13}/>}</Dropdown.Item>)}</Dropdown.Content></Dropdown.Portal></Dropdown.Root>}</div><Dropdown.Root><Dropdown.Trigger aria-label={`Actions for ${title}`} className="mb-card-more"><MoreHorizontal size={17}/></Dropdown.Trigger><Dropdown.Portal container={portalContainer}><Dropdown.Content className="mb-menu" sideOffset={4}><Dropdown.Item className="mb-menu-item" onSelect={() => setModal("table")}><Table2 size={14}/>View as table</Dropdown.Item><Dropdown.Item className="mb-menu-item" onSelect={() => downloadCsv(title, data.current)}><Download size={14}/>Download CSV</Dropdown.Item><Dropdown.Item className="mb-menu-item" onSelect={() => setModal("full")}><Expand size={14}/>Fullscreen</Dropdown.Item></Dropdown.Content></Dropdown.Portal></Dropdown.Root></div>
    <div className="mb-chart-body"><ReactECharts option={options} theme={metabaseEchartsTheme} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate /></div>
    {kind === "cancel" && <button className="mb-and-more" onClick={() => setShowAllReasons(value => !value)}>{showAllReasons ? "Show less" : `And ${Math.max(0, cancellationOrder.length - 4)} more`}</button>}
    <Dialog.Root open={modal !== null} onOpenChange={open => !open && setModal(null)}><Dialog.Portal container={portalContainer}><Dialog.Overlay className="mb-modal-overlay"/><Dialog.Content className="mb-modal"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="mb-modal-close" aria-label="Close"><X size={18}/></Dialog.Close>{modal === "full" ? <div className="mb-full-chart"><ReactECharts option={options} theme={metabaseEchartsTheme} style={{ height: "100%", width: "100%" }} notMerge/></div> : <div className="mb-table-scroll"><table><thead><tr>{["Period", "Users", "Leads", "Projects", "Request visits", "Revenue"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.current.map(row => <tr key={row.period}><td>{row.period}</td><td>{formatMb(row.users)}</td><td>{formatMb(row.leads)}</td><td>{formatMb(row.projects)}</td><td>{formatMb(row.visits)}</td><td>{formatMb(row.revenue, "money")}</td></tr>)}</tbody></table></div>}</Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
