import { hasEvent, markTouched, removeEvents } from "../generator";
import { stableChance } from "../prng";
import { cohort, eventRate } from "./metrics";
import { check, ratio, type Scenario } from "./types";

export const ga03: Scenario = {
  id: "GA-03",
  apply(dataset) {
    for (const session of dataset.sessions) if (session.scenarioKey === "GA-03" && session.day >= "2026-08-12" && hasEvent(session, "clientRequestedWhatsappForm") && stableChance(session.id + ":tracking", 0.65, dataset.seed)) {
      removeEvents(session, ["clientRequestedWhatsappForm"]);
      markTouched(session, "GA-03");
    }
  },
  assertions(dataset) {
    const before = cohort(dataset, "GA-03", 80, 130), after = cohort(dataset, "GA-03", 130, 180);
    const beforeRatio = ratio(eventRate(before, "clientRequestedWhatsappForm"), eventRate(before, "clientClickedWhatsappForm"));
    const afterRatio = ratio(eventRate(after, "clientRequestedWhatsappForm"), eventRate(after, "clientClickedWhatsappForm"));
    return [
      check("Safari request/click ratio falls", ratio(afterRatio, beforeRatio), "<", 0.50),
      check("Safari click event volume remains stable", ratio(after.filter(s => hasEvent(s, "clientClickedWhatsappForm")).length, before.filter(s => hasEvent(s, "clientClickedWhatsappForm")).length), ">", 0.75),
      check("Safari click event volume upper bound", ratio(after.filter(s => hasEvent(s, "clientClickedWhatsappForm")).length, before.filter(s => hasEvent(s, "clientClickedWhatsappForm")).length), "<", 1.25),
    ];
  },
};
