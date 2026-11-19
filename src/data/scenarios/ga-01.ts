import { addSyntheticEvent, hasEvent, markTouched, removeEvents } from "../generator";
import { stableChance } from "../prng";
import { cohort, eventRate } from "./metrics";
import { check, type Scenario } from "./types";

const contactEvents = ["clientOpenedLeadPopup", "clientClosedLeadPopup", "clientClickedWhatsappForm", "clientRequestedWhatsappForm", "clientClickedContactLead", "clientRequestedVisit"] as const;

export const ga01: Scenario = {
  id: "GA-01",
  apply(dataset) {
    const removedCrm = new Set<string>();
    for (const session of dataset.sessions) if (session.scenarioKey === "GA-01" && hasEvent(session, "clientInAvailableSpotDetail")) {
      const selected = stableChance(session.id + ":contact", session.device === "desktop" ? 0.009 : 0.11, dataset.seed);
      const hadContact = hasEvent(session, "clientOpenedLeadPopup");
      if (!selected && hadContact) {
        removeEvents(session, contactEvents);
        session.interactions = session.interactions.filter(i => i.elementId !== "contact-button" && i.elementId !== "whatsapp-button");
        removedCrm.add(session.id); markTouched(session, "GA-01");
      } else if (selected && !hadContact) {
        addSyntheticEvent(session, "clientOpenedLeadPopup", 24);
        markTouched(session, "GA-01");
      }
    }
    dataset.crm = dataset.crm.filter(r => !removedCrm.has(r.sessionId));
  },
  assertions(dataset) {
    const reached = cohort(dataset, "GA-01").filter(s => hasEvent(s, "clientInAvailableSpotDetail"));
    const desktop = reached.filter(s => s.device === "desktop"), mobile = reached.filter(s => s.device === "mobile");
    return [
      check("Desktop ficha→contacto", eventRate(desktop, "clientOpenedLeadPopup"), "<", 0.02),
      check("Mobile ficha→contacto", eventRate(mobile, "clientOpenedLeadPopup"), ">", 0.09),
      check("Mobile exceeds desktop", eventRate(mobile, "clientOpenedLeadPopup") / eventRate(desktop, "clientOpenedLeadPopup"), ">", 4),
    ];
  },
};
