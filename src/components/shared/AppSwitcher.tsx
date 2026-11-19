"use client";

import Link from "next/link";
import { useState } from "react";
import { Grid2X2, X } from "lucide-react";

const apps = [
  { label: "Inicio", href: "/" },
  { label: "Metabase", href: "/metabase/dashboard/growth-full-picture" },
  { label: "GA4", href: "/ga4/informes/eventos" },
  { label: "Clarity", href: "/clarity/panel" },
];

export function AppSwitcher() {
  const [open, setOpen] = useState(false);
  return <div className="app-switcher">
    {open && <nav aria-label="Cambiar simulador" className="app-switcher-menu">{apps.map(app => <Link key={app.href} href={app.href} onClick={() => setOpen(false)}>{app.label}</Link>)}</nav>}
    <button className="app-switcher-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Cerrar selector de apps" : "Cambiar de app"}>{open ? <X size={17} /> : <Grid2X2 size={17} />}<span>Data Maker</span></button>
  </div>;
}
