import { hasEvent, isBounce } from "../generator";
import type { Session } from "../model";
import { CAMPAIGNS } from "../universe";
import { cohort, visibleUsers } from "./metrics";
import { check, ratio, type Scenario } from "./types";

export const mb01: Scenario = {
  id: "MB-01",
  apply(dataset) {
    const byDay = new Map<string, Session[]>();
    for (const session of dataset.sessions) if (session.scenarioKey === "MB-01") {
      const rows = byDay.get(session.day) ?? []; rows.push(session); byDay.set(session.day, rows);
    }
    for (const [day, templates] of byDay) {
      if (day < "2026-09-03") continue;
      for (let i = 0; i < 39; i++) {
        const source = templates[i % templates.length];
        const id = `mb01-extra-${day}-${i}`;
        dataset.sessions.push({ ...source, id, userId: `u-${id}`, isNewUser: true,
          pageviews: [{ ...source.pageviews[0], activeTimeSec: i % 10 < 6 ? 8 : 16 }], activeTimeSec: i % 10 < 6 ? 8 : 16,
          scrollDepthPct: 25 + i % 25,
          events: [...source.events.filter(event => event.name === "session_start" || event.name === "page_view").map(event => ({ ...event })), { name: "first_visit", at: source.startedAt, page: source.landingPage }, ...(i % 10 < 6 ? [] : [{ name: "user_engagement" as const, at: source.startedAt, page: source.landingPage }])],
          interactions: [], flags: { rageClick: false, deadClick: false, excessiveScroll: false, quickBack: false, jsError: false },
          touchedBy: ["MB-01"] });
      }
    }
  },
  assertions(dataset) {
    const before = cohort(dataset, "MB-01", 124, 152), after = cohort(dataset, "MB-01", 152, 180);
    const browseBefore = dataset.sessions.filter(s => s.entryPoint === "Browse Page" && s.day >= "2026-08-06" && s.day < "2026-09-03" && !s.isBot);
    const browseAfter = dataset.sessions.filter(s => s.entryPoint === "Browse Page" && s.day >= "2026-09-03" && !s.isBot);
    const campaign = after.filter(s => s.campaign === CAMPAIGNS.bodegasDiscovery);
    const beforeIds = new Set(browseBefore.map(s => s.id)), afterIds = new Set(browseAfter.map(s => s.id));
    const browseLeadsBefore = dataset.crm.filter(r => beforeIds.has(r.sessionId)).length;
    const browseLeadsAfter = dataset.crm.filter(r => afterIds.has(r.sessionId)).length;
    const bounceBefore = ratio(browseBefore.filter(isBounce).length, browseBefore.length);
    const bounceAfter = ratio(browseAfter.filter(isBounce).length, browseAfter.length);
    const leadsBefore = dataset.crm.filter(r => r.scenarioKey === "MB-01" && r.day >= "2026-08-06" && r.day < "2026-09-03").length;
    const leadsAfter = dataset.crm.filter(r => r.scenarioKey === "MB-01" && r.day >= "2026-09-03").length;
    return [
      check("Browse users growth", ratio(visibleUsers(browseAfter), visibleUsers(browseBefore)), ">", 1.35),
      check("Browse users growth upper bound", ratio(visibleUsers(browseAfter), visibleUsers(browseBefore)), "<", 1.60),
      check("Browse leads remain near prior period", ratio(browseLeadsAfter, browseLeadsBefore), ">", 0.80),
      check("Browse leads upper bound", ratio(browseLeadsAfter, browseLeadsBefore), "<", 1.20),
      check("Paid bodegas users→leads CVR", ratio(dataset.crm.filter(r => campaign.some(s => s.id === r.sessionId)).length, visibleUsers(campaign)), "<", 0.025),
      check("Campaign leads grow slower than users", ratio(leadsAfter, leadsBefore), "<", ratio(visibleUsers(after), visibleUsers(before)) - 0.20),
      check("Paid campaign raises Browse bounce moderately", bounceAfter - bounceBefore, ">", 0.06),
      check("Browse bounce increase stays under twelve points", bounceAfter - bounceBefore, "<", 0.12),
      check("No synthetic leads on extra traffic", after.filter(s => s.id.startsWith("mb01-extra") && hasEvent(s, "clientRequestedWhatsappForm")).length, "<=", 0),
    ];
  },
};
