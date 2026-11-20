import { addSyntheticEvent, hasEvent, makeSyntheticInteraction, markTouched, removeEvents } from "../generator";
import { stableChance } from "../prng";
import { cohort } from "./metrics";
import { check, ratio, type Scenario } from "./types";

export const cl02: Scenario = {
  id: "CL-02",
  apply(dataset) {
    for (const session of dataset.sessions) if (session.scenarioKey === "CL-02") {
      const reachesContact = stableChance(session.id + ":scroll", 0.25, dataset.seed);
      session.scrollDepthPct = reachesContact ? stableChance(session.id + ":complete-scroll", 0.30, dataset.seed) ? 100 : 76 + session.id.length % 23 : 20 + session.id.length % 45;
      session.interactions = session.interactions.filter(i => i.kind !== "scroll");
      makeSyntheticInteraction(session, "scroll-band", "body", 0.5, session.scrollDepthPct / 100, Math.min(42, session.activeTimeSec - 1), "scroll");
      if (session.scrollDepthPct <= 80) removeEvents(session, ["scroll"]);
      else if (!hasEvent(session, "scroll")) addSyntheticEvent(session, "scroll", 43);
      markTouched(session, "CL-02");
    }
  },
  assertions(dataset) {
    const desktop = cohort(dataset, "CL-02");
    const mobile = dataset.sessions.filter(s => s.entryPoint === "Spot Detail" && s.device === "mobile" && !s.isBot);
    return [
      check("Desktop contact panel reach", ratio(desktop.filter(s => s.scrollDepthPct >= 75).length, desktop.length), ">", 0.20),
      check("Desktop contact panel reach upper bound", ratio(desktop.filter(s => s.scrollDepthPct >= 75).length, desktop.length), "<", 0.30),
      check("Mobile panel reach exceeds desktop", ratio(mobile.filter(s => s.scrollDepthPct >= 75).length, mobile.length) - ratio(desktop.filter(s => s.scrollDepthPct >= 75).length, desktop.length), ">", 0.04),
      check("Desktop full-page reach remains plausible", ratio(desktop.filter(s => s.scrollDepthPct === 100).length, desktop.length), ">", 0.05),
      check("Desktop full-page reach upper bound", ratio(desktop.filter(s => s.scrollDepthPct === 100).length, desktop.length), "<", 0.12),
    ];
  },
};
