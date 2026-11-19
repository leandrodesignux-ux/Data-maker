import { makeSyntheticInteraction, markTouched } from "../generator";
import { stableChance } from "../prng";
import { PAGES } from "../universe";
import { cohort } from "./metrics";
import { check, ratio, type Scenario } from "./types";

export const cl01: Scenario = {
  id: "CL-01",
  apply(dataset) {
    for (const session of dataset.sessions) if (session.scenarioKey === "CL-01" && stableChance(session.id + ":gallery", 0.35, dataset.seed)) {
      session.flags.deadClick = true;
      session.activeTimeSec = Math.max(session.activeTimeSec, 20);
      session.pageviews[0].activeTimeSec += Math.max(0, 20 - session.pageviews.reduce((sum, page) => sum + page.activeTimeSec, 0));
      const thumbnail = stableChance(session.id + ":thumb", 0.35, dataset.seed);
      makeSyntheticInteraction(session, thumbnail ? "gallery-thumbnail" : "gallery-main", thumbnail ? "[data-gallery-thumbnail]" : "[data-gallery-main]", thumbnail ? 0.31 : 0.43, thumbnail ? 0.75 : 0.36, 18, "deadClick", PAGES.spot);
      markTouched(session, "CL-01");
    }
  },
  assertions(dataset) {
    const target = cohort(dataset, "CL-01");
    const other = dataset.sessions.filter(s => s.entryPoint === "Spot Detail" && s.scenarioKey !== "CL-01" && !s.isBot);
    const allSpot = [...target, ...other];
    return [
      check("Spot gallery dead-click rate", ratio(target.filter(s => s.flags.deadClick).length, target.length), ">", 0.30),
      check("All spot detail dead-click rate", ratio(allSpot.filter(s => s.flags.deadClick).length, allSpot.length), ">", 0.08),
      check("All spot detail dead-click upper bound", ratio(allSpot.filter(s => s.flags.deadClick).length, allSpot.length), "<", 0.14),
      check("Other spot dead-click rate", ratio(other.filter(s => s.flags.deadClick).length, other.length), "<", 0.04),
      check("Gallery element has dead-click evidence", target.filter(s => s.interactions.some(i => i.elementId.startsWith("gallery-") && i.kind === "deadClick")).length, ">", 300),
    ];
  },
};
