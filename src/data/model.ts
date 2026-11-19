import type { AGENT_SOURCES, BROWSERS, CHANNELS, CITIES, CRM_STAGES, DEVICES, ENTRY_POINTS, EVENTS, LEAD_TYPES, OPERATING_SYSTEMS, PRIORITIES, SECTORS } from "./universe";

export type Channel = (typeof CHANNELS)[number];
export type Device = (typeof DEVICES)[number];
export type Browser = (typeof BROWSERS)[number];
export type OperatingSystem = (typeof OPERATING_SYSTEMS)[number];
export type Sector = (typeof SECTORS)[number];
export type City = (typeof CITIES)[number];
export type EntryPoint = (typeof ENTRY_POINTS)[number];
export type AgentSource = (typeof AGENT_SOURCES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type LeadType = (typeof LEAD_TYPES)[number];
export type CrmStage = (typeof CRM_STAGES)[number];
export type EventName = (typeof EVENTS)[number];
export type ScenarioId = "MB-01" | "MB-02" | "MB-03" | "GA-01" | "GA-02" | "GA-03" | "CL-01" | "CL-02" | "CL-03";

export interface Pageview { path: string; enteredAt: string; activeTimeSec: number }
export interface SessionEvent { name: EventName; at: string; page: string; elementId?: string }
export interface Interaction { elementId: string; selector: string; page: string; xPct: number; yPct: number; atOffsetSec: number; kind: "click" | "rageClick" | "deadClick" | "scroll" | "error" }
export interface Session {
  id: string; userId: string; isNewUser: boolean; startedAt: string; day: string;
  channel: Channel; source: string; medium: string; campaign: string; referrer: string;
  device: Device; browser: Browser; os: OperatingSystem; country: string; city: City;
  landingPage: string; entryPoint: EntryPoint; sector: Sector;
  pageviews: Pageview[]; activeTimeSec: number; scrollDepthPct: number; events: SessionEvent[];
  interactions: Interaction[]; isBot: boolean; botType: "none" | "unclassified" | "crawler" | "automation";
  flags: { rageClick: boolean; deadClick: boolean; excessiveScroll: boolean; quickBack: boolean; jsError: boolean };
  scenarioKey: ScenarioId | null; touchedBy: ScenarioId[];
}
export interface CrmRecord {
  id: string; sessionId: string; createdAt: string; day: string; stage: CrmStage;
  stageDates: Partial<Record<CrmStage, string>>; leadType: LeadType; priority: Priority;
  agentSource: AgentSource; sector: Sector; status: "open" | "cancelled" | "won";
  cancellationReason: string | null; expectedRevenueMXN: number; commissionMXN: number;
  scenarioKey: ScenarioId | null; touchedBy: ScenarioId[];
}
export interface Dataset { seed: number; sessions: Session[]; crm: CrmRecord[]; appliedScenarios: ScenarioId[] }
