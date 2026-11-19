import { makeSyntheticInteraction, markTouched } from "../generator";
import { stableChance } from "../prng";
import { cohort } from "./metrics";
import { check, ratio, type Scenario } from "./types";

export const cl03: Scenario = {
  id: "CL-03",
  apply(dataset) {
    for (const session of dataset.sessions) if (session.scenarioKey === "CL-03" && session.day >= "2026-08-02") {
      const rage = stableChance(session.id + ":autocomplete", 0.47, dataset.seed);
      const error = stableChance(session.id + ":js", 0.52, dataset.seed);
      if (rage) { session.flags.rageClick = true; makeSyntheticInteraction(session, "location-search", "[data-location-search]", 0.34, 0.11, 7, "rageClick"); }
      if (error) { session.flags.jsError = true; makeSyntheticInteraction(session, "autocomplete-error", "[data-location-search]", 0.34, 0.11, 8, "error"); }
      if (rage || error) markTouched(session, "CL-03");
    }
  },
  assertions(dataset) {
    const target = cohort(dataset, "CL-03", 120, 180);
    const other = dataset.sessions.filter(s => s.scenarioKey !== "CL-03" && s.device === "mobile" && s.browser === "Safari" && !s.isBot);
    return [
      check("Mobile Safari search rage-click rate", ratio(target.filter(s => s.flags.rageClick).length, target.length), ">", 0.40),
      check("Mobile Safari search JS-error rate", ratio(target.filter(s => s.flags.jsError).length, target.length), ">", 0.45),
      check("Other mobile Safari rage-click rate", ratio(other.filter(s => s.flags.rageClick).length, other.length), "<", 0.03),
    ];
  },
};
