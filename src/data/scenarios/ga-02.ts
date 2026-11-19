import { markTouched } from "../generator";
import type { Session } from "../model";
import { stableChance } from "../prng";
import { cohort, avg, engagedRate } from "./metrics";
import { check, ratio, type Scenario } from "./types";

function lowerIntent(session: Session, lightEngagement = false) {
  session.activeTimeSec = lightEngagement ? 11 : 6 + session.id.length % 4;
  session.pageviews = [{ ...session.pageviews[0], activeTimeSec: session.activeTimeSec }];
  session.events = session.events.filter(e => e.name === "session_start" || e.name === "page_view" || e.name === "first_visit");
  session.interactions = [];
  session.scrollDepthPct = 18;
  session.flags = { rageClick: false, deadClick: false, excessiveScroll: false, quickBack: false, jsError: false };
}

export const ga02: Scenario = {
  id: "GA-02",
  apply(dataset) {
    const byDay = new Map<string, Session[]>();
    for (const session of dataset.sessions) if (session.scenarioKey === "GA-02") {
      if (session.day < "2026-09-01") continue;
      lowerIntent(session, stableChance(session.id + ":engaged", 0.27, dataset.seed)); markTouched(session, "GA-02");
      const rows = byDay.get(session.day) ?? []; rows.push(session); byDay.set(session.day, rows);
    }
    for (const [day, templates] of byDay) for (let i = 0; i < 10; i++) {
      const source = templates[i % templates.length];
      const id = `ga02-extra-${day}-${i}`;
      const extra: Session = { ...source, id, userId: `u-${id}`, isNewUser: true,
        pageviews: source.pageviews.map(p => ({ ...p })), events: source.events.map(e => ({ ...e })), interactions: [],
        flags: { ...source.flags }, touchedBy: ["GA-02"] };
      lowerIntent(extra);
      if (!extra.events.some(event => event.name === "first_visit")) extra.events.push({ name: "first_visit", at: extra.startedAt, page: extra.landingPage });
      dataset.sessions.push(extra);
    }
  },
  assertions(dataset) {
    const before = cohort(dataset, "GA-02", 120, 150), after = cohort(dataset, "GA-02", 150, 180);
    return [
      check("Paid Social session growth", ratio(after.length, before.length), ">", 1.50),
      check("Awareness engagement rate", engagedRate(after), "<", 0.20),
      check("Awareness mean active seconds", avg(after, s => s.activeTimeSec), "<", 10),
      check("Awareness key event rate", after.filter(s => s.events.some(e => e.name === "clientRequestedWhatsappForm")).length / after.length, "<", 0.01),
    ];
  },
};
