import { dayAt, HISTORY_DAYS, SIMULATED_TODAY } from "./clock";
import type { AgentSource, Channel, CrmRecord, CrmStage, Dataset, Device, EntryPoint, EventName, Interaction, OperatingSystem, ScenarioId, Sector, Session } from "./model";
import { mulberry32, pick, stableChance } from "./prng";
import { AGENT_SOURCES, BROWSERS, browsePath, CAMPAIGNS, CANCELLATION_REASONS, CHANNELS, CITIES, CRM_STAGES, DEVICES, ENTRY_POINTS, LEAD_TYPES, OPERATING_SYSTEMS, PAGES, PRIORITIES, REFERRERS, SECTORS, SOURCE_MEDIUM } from "./universe";
import { scenarios } from "./scenarios";

export const DEFAULT_SEED = 0x5eed2026;

type Profile = Exclude<ScenarioId, "MB-03"> | "MB-03" | null;
const profileWeights: readonly [Profile, number][] = [
  ["MB-01", 0.08], ["MB-02", 0.06], ["MB-03", 0.16], ["GA-01", 0.12],
  ["GA-02", 0.08], ["GA-03", 0.12], ["CL-01", 0.07], ["CL-02", 0.06], ["CL-03", 0.05], [null, 0.20],
];

function profile(random: () => number): Profile {
  const roll = random(); let cumulative = 0;
  for (const [key, weight] of profileWeights) { cumulative += weight; if (roll < cumulative) return key; }
  return null;
}

function eventAt(startedAt: string, offset: number): string {
  return new Date(Date.parse(startedAt) + offset * 1000).toISOString();
}

function addEvent(session: Session, name: EventName, offset: number, page: string, elementId?: string) {
  session.events.push({ name, at: eventAt(session.startedAt, offset), page, elementId });
}

function addInteraction(session: Session, elementId: string, selector: string, page: string, xPct: number, yPct: number, atOffsetSec: number, kind: Interaction["kind"]) {
  session.interactions.push({ elementId, selector, page, xPct, yPct, atOffsetSec, kind });
}

function profileDimensions(key: Profile, random: () => number): { channel: Channel; sector: Sector; entryPoint: EntryPoint; device: Device; os: OperatingSystem; browser: Session["browser"]; campaign: string; agentSource: AgentSource } {
  const genericChannel = pick(CHANNELS, random);
  const result = {
    channel: genericChannel as Channel,
    sector: pick(SECTORS, random) as Sector,
    entryPoint: pick(ENTRY_POINTS, random) as EntryPoint,
    device: pick(DEVICES, random) as Device,
    os: pick(OPERATING_SYSTEMS, random) as OperatingSystem,
    browser: pick(BROWSERS, random) as Session["browser"],
    campaign: "" as string,
    agentSource: pick(AGENT_SOURCES, random) as AgentSource,
  };
  switch (key) {
    case "MB-01": Object.assign(result, { channel: "Paid Search", sector: "Bodegas", entryPoint: "Browse Page", campaign: CAMPAIGNS.bodegasDiscovery }); break;
    case "MB-02": Object.assign(result, { channel: "Direct", sector: "Naves industriales", entryPoint: "Browse Page", agentSource: "VIRTUAL" }); break;
    case "MB-03": Object.assign(result, { channel: "Direct", sector: "Locales comerciales", entryPoint: "Home" }); break;
    case "GA-01": Object.assign(result, { channel: "Organic Search", sector: "Oficinas", entryPoint: "Browse Page", device: random() < 0.58 ? "mobile" : "desktop" }); break;
    case "GA-02": Object.assign(result, { channel: "Paid Social", sector: "Locales comerciales", entryPoint: "Browse Page", campaign: CAMPAIGNS.socialAwareness }); break;
    case "GA-03": Object.assign(result, { channel: "Organic Search", sector: "Bodegas", entryPoint: "Spot Detail", device: "mobile", os: "iOS", browser: "Safari" }); break;
    case "CL-01": Object.assign(result, { channel: "Referral", sector: "Bodegas", entryPoint: "Spot Detail", device: "desktop" }); break;
    case "CL-02": Object.assign(result, { channel: "Organic Search", sector: "Oficinas", entryPoint: "Spot Detail", device: "desktop" }); break;
    case "CL-03": Object.assign(result, { channel: "Direct", sector: "Locales comerciales", entryPoint: "Home", device: "mobile", os: "iOS", browser: "Safari" }); break;
  }
  if (result.device === "mobile" && result.os !== "iOS" && result.os !== "Android") result.os = random() < 0.55 ? "Android" : "iOS";
  if (result.device === "desktop" && (result.os === "iOS" || result.os === "Android")) result.os = random() < 0.7 ? "Windows" : "macOS";
  if (result.os === "iOS") result.browser = "Safari";
  if (!result.campaign) result.campaign = result.channel === "Paid Search" ? CAMPAIGNS.evergreenSearch : result.channel === "Paid Social" ? CAMPAIGNS.socialEvergreen : result.channel === "Email" ? CAMPAIGNS.emailDigest : result.channel === "Organic Search" ? CAMPAIGNS.organic : result.channel === "Direct" ? CAMPAIGNS.direct : result.channel === "AI Assistants" ? CAMPAIGNS.ai : CAMPAIGNS.referral;
  return result;
}

function createSession(index: number, day: string, key: Profile, random: () => number, bot = false): Session {
  const dimensions = bot ? profileDimensions("MB-03", random) : profileDimensions(key, random);
  if (bot) Object.assign(dimensions, { channel: "Direct", entryPoint: "Home", device: "desktop", os: "Linux", browser: "Chrome", campaign: CAMPAIGNS.direct });
  const second = Math.floor(random() * 85_000);
  const startedAt = new Date(Date.parse(`${day}T00:00:00.000Z`) + second * 1000).toISOString();
  const [defaultSource, medium] = SOURCE_MEDIUM[dimensions.channel];
  const referrer = pick(REFERRERS[dimensions.channel], random);
  const city = pick(CITIES, random);
  const landingPage = dimensions.entryPoint === "Browse Page" ? browsePath(dimensions.sector, city) : dimensions.entryPoint === "Spot Detail" ? PAGES.spot : dimensions.entryPoint === "Blog" ? PAGES.blog : dimensions.entryPoint === "Complejo" ? PAGES.complex :
    key === null && (dimensions.channel === "Paid Search" || dimensions.channel === "Paid Social") && stableChance(`s-${index}:landing`, 0.18) ? PAGES.paidLanding : PAGES.home;
  const hostname = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : "";
  const source = dimensions.channel === "Direct" || dimensions.channel === "Email" ? defaultSource :
    hostname === "google.com" ? "google" : hostname === "bing.com" ? "bing" :
    hostname === "instagram.com" ? "instagram" : hostname === "facebook.com" ? "facebook" :
    hostname === "linkedin.com" ? "linkedin" : hostname || defaultSource;
  const session: Session = {
    id: `s-${index}`, userId: `u-${index}`, isNewUser: true, startedAt, day,
    channel: dimensions.channel, source, medium, campaign: dimensions.campaign,
    referrer, device: dimensions.device,
    browser: dimensions.browser, os: dimensions.os, country: "México", city,
    landingPage, entryPoint: dimensions.entryPoint, sector: dimensions.sector,
    pageviews: [{ path: landingPage, enteredAt: startedAt, activeTimeSec: 0 }],
    activeTimeSec: bot ? 1 + Math.floor(random() * 3) : 7 + Math.floor(random() * 120),
    scrollDepthPct: bot ? 0 : 18 + Math.floor(random() * 82), events: [], interactions: [],
    isBot: bot, botType: bot ? "unclassified" : "none",
    flags: { rageClick: false, deadClick: false, excessiveScroll: false, quickBack: false, jsError: false },
    scenarioKey: key, touchedBy: [],
  };
  addEvent(session, "session_start", 0, landingPage);
  addEvent(session, "page_view", 1, landingPage);
  if (bot) return session;

  const first = random() < 0.84;
  session.isNewUser = first;
  if (first) addEvent(session, "first_visit", 1, landingPage);
  if (random() < 0.65) addEvent(session, "clientAcceptedDefaultCookies", 2, landingPage, "cookie-accept");
  if (dimensions.entryPoint === "Home" && stableChance(session.id + ":register", 0.025)) addEvent(session, "clientClickedRegisterForm", 3, landingPage, "register-button");
  let currentPage = landingPage;
  let reachedSpot = dimensions.entryPoint === "Spot Detail";
  if (dimensions.entryPoint === "Home" && random() < 0.58) {
    addEvent(session, "clientSearchedSpotSearch", 5, PAGES.home, "location-search");
    currentPage = browsePath(dimensions.sector, city);
    session.pageviews.push({ path: currentPage, enteredAt: eventAt(startedAt, 7), activeTimeSec: 0 });
    addEvent(session, "page_view", 7, currentPage);
  }
  if ((dimensions.entryPoint === "Browse Page" || currentPage !== landingPage) && random() < 0.68) {
    session.activeTimeSec = Math.max(session.activeTimeSec, 18);
    if (random() < 0.16) { addEvent(session, "clientOpenedFilterPrice", 8, currentPage, "price-filter"); addEvent(session, "clientAppliedFilterPrice", 10, currentPage, "price-filter"); }
    addEvent(session, "clientClickedSpotCardBrowsePage", 12, currentPage, "spot-card");
    addInteraction(session, "spot-card", ".spot-card", currentPage, 0.46, 0.43, 12, "click");
    currentPage = PAGES.spot; reachedSpot = true;
    session.pageviews.push({ path: currentPage, enteredAt: eventAt(startedAt, 15), activeTimeSec: 0 });
    addEvent(session, "page_view", 15, currentPage);
    addEvent(session, "clientInAvailableSpotDetail", 16, currentPage);
  } else if (reachedSpot) addEvent(session, "clientInAvailableSpotDetail", 3, currentPage);

  if (reachedSpot && random() < 0.20) {
    session.activeTimeSec = Math.max(session.activeTimeSec, 42);
    addEvent(session, "clientOpenedLeadPopup", 24, currentPage, "contact-button");
    addInteraction(session, "contact-button", "[data-contact]", currentPage, 0.84, 0.78, 24, "click");
    if (random() < 0.85) {
      addEvent(session, "clientClickedWhatsappForm", 30, currentPage, "whatsapp-button");
      addInteraction(session, "whatsapp-button", "[data-whatsapp]", currentPage, 0.84, 0.84, 30, "click");
      if (random() < 0.58) addEvent(session, "clientRequestedWhatsappForm", 33, currentPage, "whatsapp-button");
    }
    if (random() < 0.18) { addEvent(session, "clientClickedContactLead", 35, currentPage, "contact-form"); addEvent(session, "clientRequestedVisit", 38, currentPage, "visit-button"); }
    if (random() < 0.14) addEvent(session, "clientClosedLeadPopup", 39, currentPage, "contact-close");
  }
  if (session.activeTimeSec >= 10 || session.pageviews.length >= 2 || session.events.some(e => e.name === "clientRequestedWhatsappForm")) addEvent(session, "user_engagement", 10, currentPage);
  if (session.scrollDepthPct > 80) addEvent(session, "scroll", Math.min(45, session.activeTimeSec - 1), currentPage);
  const baseDead = random() < 0.015, baseRage = random() < 0.008;
  session.flags = { deadClick: baseDead, rageClick: baseRage, excessiveScroll: random() < 0.006, quickBack: random() < 0.02, jsError: random() < 0.004 };
  if (baseDead) { session.activeTimeSec = Math.max(session.activeTimeSec, 24); addInteraction(session, "gallery-main", "[data-gallery-main]", currentPage, 0.41, 0.36, 22, "deadClick"); }
  if (baseRage) { session.activeTimeSec = Math.max(session.activeTimeSec, 10); addInteraction(session, "location-search", "[data-location-search]", currentPage, 0.31, 0.10, 8, "rageClick"); }
  // Normal UI clicks provide a realistic baseline for Clarity's element anchored heatmaps.
  if (reachedSpot) {
    if (stableChance(session.id + ":gallery-view", .36)) addInteraction(session, "gallery-main", "[data-gallery-main]", PAGES.spot, .43, .37, 19, "click");
    if (stableChance(session.id + ":thumbnail-view", .22)) addInteraction(session, "gallery-thumbnail", "[data-gallery-thumbnail]", PAGES.spot, .32, .75, 21, "click");
    if (stableChance(session.id + ":amenities-view", .14)) addInteraction(session, "spot-amenities", "[data-spot-amenities]", PAGES.spot, .54, .69, 26, "click");
    if (stableChance(session.id + ":share-spot", .08)) addInteraction(session, "spot-share", "[data-spot-share]", PAGES.spot, .78, .13, 16, "click");
  }
  if (session.events.some(event => event.name === "clientSearchedSpotSearch")) addInteraction(session, "location-search", "[data-location-search]", PAGES.home, .34, .11, 5, "click");
  if (session.flags.jsError) addInteraction(session, "page-script", "script", currentPage, 0, 0, 9, "error");
  addInteraction(session, "scroll-band", "body", currentPage, 0.5, session.scrollDepthPct / 100, Math.min(42, session.activeTimeSec - 1), "scroll");
  const views = session.pageviews.length;
  session.pageviews.forEach((page, pageIndex) => { page.activeTimeSec = Math.floor(session.activeTimeSec / views) + (pageIndex === 0 ? session.activeTimeSec % views : 0); });
  return session;
}

function createCrm(session: Session, random: () => number, agentSource: AgentSource): CrmRecord | null {
  if (session.isBot || !session.events.some(event => event.name === "clientRequestedWhatsappForm" || event.name === "clientRequestedVisit")) return null;
  const stageDates: Partial<Record<CrmStage, string>> = { lead: session.startedAt };
  let stage: CrmStage = "lead";
  const transitions = [0.56, 0.30, 0.72, 0.69, 0.24, 0.48, 0.82];
  for (let i = 1; i < CRM_STAGES.length; i++) {
    if (random() >= transitions[i - 1]) break;
    stage = CRM_STAGES[i];
    stageDates[stage] = eventAt(session.startedAt, 60 + i * 30);
  }
  const status = stage === "won" ? "won" : stage === "lead" || stage === "project" && random() < 0.55 ? "cancelled" : "open";
  const expectedRevenueMXN = Math.round((200_000 + random() * 4_800_000) / 1000) * 1000;
  const commissionMXN = Math.round(expectedRevenueMXN * (0.025 + random() * 0.035));
  return {
    id: `crm-${session.id}`, sessionId: session.id, createdAt: session.startedAt, day: session.day,
    stage, stageDates, leadType: pick(LEAD_TYPES, random), priority: pick(PRIORITIES, random),
    agentSource, sector: session.sector, status,
    cancellationReason: status === "cancelled" ? pick(CANCELLATION_REASONS, random) : null,
    expectedRevenueMXN, commissionMXN, scenarioKey: session.scenarioKey, touchedBy: [],
  };
}

export function createBaseDataset(seed = DEFAULT_SEED): Dataset {
  const random = mulberry32(seed);
  const sessions: Session[] = [], crm: CrmRecord[] = [];
  let index = 0;
  for (let dayNumber = 0; dayNumber < HISTORY_DAYS; dayNumber++) {
    const day = dayAt(dayNumber);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    const weekly = weekday === 0 ? 0.70 : weekday === 6 ? 0.77 : weekday === 5 ? 0.98 : 1.10;
    const trend = 0.95 + dayNumber / (HISTORY_DAYS - 1) * 0.10;
    const humanCount = Math.round(230 * weekly * trend * (0.94 + random() * 0.12));
    const botCount = Math.round(65 * weekly * (0.95 + random() * 0.10));
    for (let i = 0; i < humanCount + botCount; i++) {
      const bot = i >= humanCount;
      const key = bot ? "MB-03" : profile(random);
      const session = createSession(++index, day, key, random, bot);
      if (!bot && index > 50 && !session.isNewUser) session.userId = `u-${Math.floor(random() * (index - 1)) + 1}`;
      sessions.push(session);
      const agentSource = key === "MB-02" ? "VIRTUAL" : pick(AGENT_SOURCES, random);
      const record = createCrm(session, random, agentSource);
      if (record) crm.push(record);
    }
  }
  return { seed, sessions, crm, appliedScenarios: [] };
}

export function generateDataset(seed = DEFAULT_SEED, enabled: readonly ScenarioId[] = scenarios.map(s => s.id)): Dataset {
  const dataset = createBaseDataset(seed);
  for (const scenario of scenarios) if (enabled.includes(scenario.id)) {
    scenario.apply(dataset);
    dataset.appliedScenarios.push(scenario.id);
  }
  return dataset;
}

export function markTouched<T extends { scenarioKey: ScenarioId | null; touchedBy: ScenarioId[] }>(item: T, id: ScenarioId) {
  if (item.scenarioKey !== id) throw new Error(`${id} attempted to mutate ${item.scenarioKey ?? "general"} slice`);
  item.touchedBy.push(id);
}

export function hasEvent(session: Session, name: EventName): boolean { return session.events.some(event => event.name === name); }
export function removeEvents(session: Session, names: readonly EventName[]) { session.events = session.events.filter(event => !names.includes(event.name)); }
export function addSyntheticEvent(session: Session, name: EventName, offset: number, page = PAGES.spot) { addEvent(session, name, offset, page); }
export function makeSyntheticInteraction(session: Session, elementId: string, selector: string, xPct: number, yPct: number, offset: number, kind: Interaction["kind"], page = session.landingPage) { addInteraction(session, elementId, selector, page, xPct, yPct, offset, kind); }
export function stageAtLeast(record: CrmRecord, stage: CrmStage): boolean { return CRM_STAGES.indexOf(record.stage) >= CRM_STAGES.indexOf(stage); }
export function isVisibleUser(session: Session): boolean { return !session.isBot || session.botType === "unclassified"; }
export function isEngaged(session: Session): boolean { return session.activeTimeSec >= 10 || session.pageviews.length >= 2 || hasEvent(session, "clientRequestedWhatsappForm") || hasEvent(session, "clientRequestedVisit"); }
export function isBounce(session: Session): boolean { return session.pageviews.length === 1 && !isEngaged(session); }
export const dataClock = SIMULATED_TODAY;
