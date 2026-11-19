import Link from "next/link";
import { ArrowUpRight, BarChart3, ChartNoAxesCombined, MousePointer2 } from "lucide-react";
import { CasesHighlights } from "@/components/shared/CasesHighlights";

const apps = [
  { name: "Metabase", label: "Embudo de negocio", description: "Explora el recorrido desde usuarios y leads hasta visitas, proyectos y revenue.", href: "/metabase/dashboard/growth-full-picture", icon: BarChart3, tone: "metabase" },
  { name: "Google Analytics 4", label: "Comportamiento digital", description: "Investiga adquisición, eventos, páginas y embudos de conversión.", href: "/ga4/informes/eventos", icon: ChartNoAxesCombined, tone: "ga4" },
  { name: "Microsoft Clarity", label: "Experiencia de usuario", description: "Observa sesiones, fricciones de interacción y mapas térmicos.", href: "/clarity/panel", icon: MousePointer2, tone: "clarity" },
];

export default function Home() {
  return <main className="hub">
    <div className="hub-inner">
      <header className="hub-header"><div className="hub-mark">D<span>M</span></div><span>DATA MAKER</span><span className="hub-header-note">Simulador de entrenamiento · datos ficticios</span></header>
      <section className="hub-hero"><p className="hub-eyebrow">ENTRENAMIENTO ANALÍTICO</p><h1>Encuentra la historia<br /><em>detrás de los datos.</em></h1><p>Practica la investigación de problemas de producto y growth en tres herramientas simuladas, con un universo compartido de datos ficticios.</p></section>
      <section aria-labelledby="tools-title"><div className="hub-section-heading"><h2 id="tools-title">Explorar herramientas</h2><span>Elige una para comenzar</span></div><div className="hub-grid">{apps.map(app => { const Icon = app.icon; return <Link className={`hub-card hub-card-${app.tone}`} href={app.href} key={app.name}><div className="hub-card-top"><span className="hub-icon"><Icon size={27} strokeWidth={1.7} /></span><ArrowUpRight size={20} /></div><div><p>{app.label}</p><h3>{app.name}</h3><span>{app.description}</span></div><strong>Explorar <ArrowUpRight size={16} /></strong></Link>; })}</div></section>
      <CasesHighlights/>
      <footer className="hub-footer">Data Maker <span>Un espacio seguro para practicar con datos ficticios.</span></footer>
    </div>
  </main>;
}
