/** All names and routes below are fictional training data. */
export const CHANNELS = ["Organic Search", "Direct", "Paid Search", "Paid Social", "Referral", "Email", "Organic Social", "AI Assistants"] as const;
export const DEVICES = ["mobile", "desktop", "tablet"] as const;
export const BROWSERS = ["Chrome", "Safari", "Edge", "Firefox", "Samsung Internet"] as const;
export const OPERATING_SYSTEMS = ["Windows", "macOS", "iOS", "Android", "Linux"] as const;
export const SECTORS = ["Oficinas", "Locales comerciales", "Bodegas", "Naves industriales", "Terrenos", "Complejos"] as const;
export const CITIES = ["Ciudad de México", "Monterrey", "Guadalajara", "Querétaro", "Puebla", "Mérida", "León", "Tijuana"] as const;
export const ENTRY_POINTS = ["Home", "Browse Page", "Spot Detail", "Blog", "Complejo"] as const;
export const AGENT_SOURCES = ["CREX", "NEXT", "VIRTUAL"] as const;
export const PRIORITIES = ["P0", "P1", "P2", "P3", "P4", "P5"] as const;
export const LEAD_TYPES = ["Inquilino", "Propietario", "Broker"] as const;
export const CRM_STAGES = ["lead", "project", "requestVisit", "confirmedVisit", "completedVisit", "loi", "contract", "won"] as const;
export const CANCELLATION_REASONS = ["Cancelada por cliente/inquilino", "Espacio no adecuado – Presupuesto", "Espacio no adecuado – Zona", "Espacio no adecuado – Metraje", "Espacio no adecuado – Características", "Sin respuesta del cliente/inquilino", "Oferta no disponible"] as const;
export const EVENTS = ["page_view", "session_start", "first_visit", "user_engagement", "scroll", "clientAcceptedDefaultCookies", "clientClickedSpotCardBrowsePage", "clientInAvailableSpotDetail", "clientOpenedLeadPopup", "clientClosedLeadPopup", "clientOpenedFilterPrice", "clientAppliedFilterPrice", "clientSearchedSpotSearch", "clientClickedWhatsappForm", "clientRequestedWhatsappForm", "clientClickedContactLead", "clientRequestedVisit", "clientClickedRegisterForm"] as const;

export const CAMPAIGNS = {
  evergreenSearch: "Búsqueda Espacios Norte",
  bodegasDiscovery: "Ruta Bodega Horizonte",
  socialAwareness: "Vitrina Urbana 360",
  socialEvergreen: "Explora Nuevos Espacios",
  emailDigest: "Boletín Espacios Semanal",
  organic: "(organic)", direct: "(direct)", referral: "(referral)", ai: "(ai-assistant)",
} as const;

export const REFERRERS: Record<(typeof CHANNELS)[number], readonly string[]> = {
  "Organic Search": ["https://www.google.com/", "https://www.bing.com/"], Direct: [""],
  "Paid Search": ["https://www.google.com/", "https://www.bing.com/"],
  "Paid Social": ["https://www.instagram.com/", "https://www.facebook.com/"],
  Referral: ["https://directorio-urbano.example/", "https://revista-espacios.example/"],
  Email: ["https://boletin-espacios.example/"],
  "Organic Social": ["https://www.linkedin.com/", "https://www.instagram.com/"],
  "AI Assistants": ["https://chatgpt.com/", "https://www.perplexity.ai/"],
};

export const SOURCE_MEDIUM: Record<(typeof CHANNELS)[number], readonly [string, string]> = {
  "Organic Search": ["google", "organic"], Direct: ["(direct)", "(none)"],
  "Paid Search": ["google", "cpc"], "Paid Social": ["instagram", "paid_social"],
  Referral: ["directorio-urbano.example", "referral"], Email: ["boletin-espacios", "email"],
  "Organic Social": ["linkedin", "social"], "AI Assistants": ["chatgpt.com", "referral"],
};

export const PAGES = {
  home: "/",
  browse: {
    Oficinas: "/oficinas/renta/ciudad-de-mexico",
    "Locales comerciales": "/locales-comerciales/renta/ciudad-de-mexico",
    Bodegas: "/bodegas/renta",
    "Naves industriales": "/naves-industriales/renta/monterrey",
    Terrenos: "/terrenos/venta/queretaro",
    Complejos: "/complejos/ciudad-de-mexico",
  },
  spot: "/spots/espacio-demo-azul",
  complex: "/complejos/centro-urbano-demo",
  blog: "/blog/guia-de-espacios-comerciales",
  paidLanding: "/iframe/espacios-para-tu-equipo",
} as const;

const sectorSlugs: Record<(typeof SECTORS)[number], string> = {
  Oficinas: "oficinas", "Locales comerciales": "locales-comerciales", Bodegas: "bodegas",
  "Naves industriales": "naves-industriales", Terrenos: "terrenos", Complejos: "complejos",
};
const citySlugs: Record<(typeof CITIES)[number], string> = {
  "Ciudad de México": "ciudad-de-mexico", Monterrey: "monterrey", Guadalajara: "guadalajara",
  Querétaro: "queretaro", Puebla: "puebla", Mérida: "merida", León: "leon", Tijuana: "tijuana",
};
export function browsePath(sector: (typeof SECTORS)[number], city: (typeof CITIES)[number]): string {
  return `/${sectorSlugs[sector]}/${sector === "Terrenos" ? "venta" : "renta"}/${citySlugs[city]}`;
}
