import { markTouched } from "../generator";
import { cohort, visibleUsers } from "./metrics";
import { isBounce, isVisibleUser } from "../generator";
import { check, ratio, type Scenario } from "./types";

export const mb03: Scenario = {
  id: "MB-03",
  apply(dataset) {
    for (const session of dataset.sessions) if (session.scenarioKey === "MB-03" && session.isBot && session.day >= "2026-08-12") {
      session.botType = "crawler"; markTouched(session, "MB-03");
    }
  },
  assertions(dataset) {
    const before = cohort(dataset, "MB-03", 102, 130), after = cohort(dataset, "MB-03", 130, 158);
    const afterLeads = dataset.crm.filter(r => r.scenarioKey === "MB-03" && r.day >= "2026-08-12" && r.day < "2026-09-09");
    const visibleIds = new Set(after.filter(isVisibleUser).map(s => s.id));
    const bounceBefore = ratio(before.filter(isBounce).length, before.length);
    const afterVisible = after.filter(isVisibleUser);
    const bounceAfter = ratio(afterVisible.filter(isBounce).length, afterVisible.length);
    return [
      check("Visible user drop after bot classification", 1 - ratio(visibleUsers(after), visibleUsers(before)), ">", 0.55),
      check("Visible user drop upper bound", 1 - ratio(visibleUsers(after), visibleUsers(before)), "<", 0.78),
      check("Bounce rate falls after bot classification", bounceAfter - bounceBefore, "<", -0.25),
      check("Leads preserved when detected bots are excluded", ratio(afterLeads.filter(r => visibleIds.has(r.sessionId)).length, afterLeads.length), ">=", 1),
    ];
  },
};
