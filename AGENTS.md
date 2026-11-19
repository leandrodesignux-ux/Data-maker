# Data Maker — instrucciones para el agente

Lee este archivo completo antes de cada tarea. Es la fuente de verdad del proyecto.

## 1. Qué es Data Maker

Data Maker es un **simulador interactivo de entrenamiento analítico**. Replica con alta fidelidad visual y de comportamiento tres herramientas —**Metabase**, **Google Analytics 4** y **Microsoft Clarity**— alimentadas con **datos ficticios** de un marketplace inmobiliario comercial inspirado en spot2.mx (oficinas, locales comerciales, bodegas, naves industriales, terrenos, complejos).

El objetivo es que un equipo de producto/growth practique cómo **encontrar, explicar y priorizar problemas** (por ejemplo: mucho alcance y poca conversión) navegando, filtrando, segmentando y comparando exactamente como lo haría en las herramientas reales.

Tiene dos modos:

- **Exploración libre**: el usuario elige una de las tres apps y navega por ella como si fuera la real.
- **Casos**: un caso abre la app correspondiente en una vista inicial y muestra un panel flotante de "Misión" con contexto de negocio, checklist de pasos que se marcan solos al detectar lo que el usuario hace (filtros aplicados, vistas visitadas, desgloses), pistas progresivas, preguntas de diagnóstico y, al final, la solución explicada.

Idioma: la interfaz general (hub, panel de casos) va en español. Cada app simulada respeta el idioma de sus capturas: **GA4 y Clarity en español**, **Metabase en inglés** (como el dashboard de referencia).

## 2. Referencias visuales (obligatorio)

Las capturas reales están en:

- `reference/metabase/` — dashboard "Growth Full Picture" (variantes BP, Blog, Spot Detail P1–P5).
- `reference/ga4/` — informes de Eventos, detalle de evento, Exploraciones de embudo, editor de pasos de embudo.
- `reference/clarity/` — Panel (Información general) y Mapas térmicos (`segmentos1.PNG`).

Antes de construir o modificar cualquier pantalla, **abre y estudia las capturas relevantes**. Reproduce layout, grid, espaciados, tamaños de tipografía, pesos, colores, bordes, radios, sombras, iconografía, densidad de información y estados (hover, activo, seleccionado, deshabilitado). Si una interacción no aparece en las capturas, imita cómo se comporta la herramienta real.

Extrae los colores de las capturas (puedes muestrear píxeles con un script de Python/PIL) y documéntalos como tokens en el tema de cada app. No inventes paletas.

### Qué muestra cada captura

**Metabase** (tema oscuro): título del dashboard con acciones a la derecha; tabs `Growth / Supply / Dev`; barra de filtros tipo chip en varias filas (Time grouping, Date Picker, Lead Type, Sector, Comparison Type, Cohort Type, Channel, Traffic Type, Campaign Name, Priority, Entry Point, User Sospechoso, User Industria Role, CTAs, Origen de visita, Estatus de visita, Agent Source, Spot State); los filtros activos muestran el valor en azul y una "x"; tarjetas escalares con número grande, fecha y variación vs periodo anterior (flecha verde/roja); secciones con título (Users, Leads, Leads Atribuidos, Proyectos, Revenue, Pipeline); gráficos combinados barra + línea con etiquetas de datos sobre cada punto, barras apiladas por categoría (P0–P5, CREX/NEXT/VIRTUAL), líneas multiserie con leyenda larga truncada en "And N more", línea de objetivo punteada ("Target $2M"), barras apiladas diarias de pipeline.

**GA4** (tema claro): banner informativo superior; barra superior con logo de Analytics, selector de cuenta/propiedad y buscador; riel de iconos a la izquierda (Inicio, Informes, Explorar, Publicidad, Administrar abajo); menú de informes colapsable (Informe panorámico, Tiempo real, Ciclo de vida > Adquisición / Interacción / Monetización / Retención, Objetivos de negocio, Search Console); chip "Todos los usuarios" + "Añadir comparación"; selector de rango de fechas a la derecha; título de informe con selector de dimensión; gráfico de línea/área con selector "Día/Semana/Mes"; tabla con búsqueda, filas por página, paginación, checkboxes "incluir en gráfico", dimensión secundaria (+), columnas numéricas con % del total y fila de totales. Página de detalle de evento: tarjetas de métricas, mapa mundial por país, donut por sexo, eventos por sesión, tabla de parámetros. Exploraciones: panel Variables (nombre, rango, segmentos, dimensiones, métricas), panel Configuración (técnica, visualización, pasos, desglose), gráfico de barras por paso con porcentaje de abandono, tabla por paso y categoría de dispositivo, modal lateral "Editar los pasos del embudo de conversión" con resumen a la derecha.

**Clarity** (tema claro lavanda): barra superior con selector de proyecto y navegación central (Panel, Grabaciones, Mapas Térmicos, Configuración); subtabs (Información general, Google Analytics, Visibilidad de AI); botones Filtros / Segmentos / rango "Últimos 7 días" / Guardar como segmento; 4 KPIs (Sesiones con bots excluidos, Páginas por sesión, Profundidad de desplazamiento, Tiempo activo empleado); tarjetas arrastrables: Información general de los usuarios (activos, únicos, nuevos vs recurrentes), Ideas (Clics continuos, Clics fallidos, Desplazamiento excesivo, Retrocesos rápidos), Eventos inteligentes, Origen de referencia/Canal/Campaña/Fuente, Exploradores/Dispositivos/SO (donut), Rendimiento (puntuación + LCP/INP/CLS), Páginas principales, Errores de JavaScript (medidor), Tráfico de bots. Cada fila tiene íconos de "ver grabaciones" y "ver mapa térmico". Mapas térmicos: toolbar con dispositivo (PC/tablet/móvil), modos Clic / Desplazamiento / Atención, Comparar, Cambiar captura, Resumir mapas térmicos; panel izquierdo "Clic / Área" con elementos ordenados por clics (selector CSS, número de clics y %, "Ver grabaciones"); overlay de calor sobre la página con marcadores numerados; barra inferior con vistas de página, clics y leyenda "Más populares → Menos popular".

### Privacidad y marcas

- Las capturas contienen **datos reales de la empresa**. Úsalas solo como referencia visual. **Ningún número, nombre de campaña, URL privada, nombre de persona o métrica real se copia al dataset.** Todo lo que se muestre en la app sale del generador ficticio.
- `reference/` está en `.gitignore` y nunca se sube al repositorio.
- No incrustes logos oficiales como imágenes. Recréalos de forma aproximada con iconos (lucide-react) y texto. Muestra un aviso discreto y permanente: "Simulador de entrenamiento · datos ficticios".

## 3. Stack técnico

- **Next.js** (última versión estable) con **App Router** y **TypeScript estricto**.
- **React**; las vistas de cada app son client components porque todo es interactivo.
- **Tailwind CSS v4** + variables CSS. Cada app tiene su tema aislado por scope (`[data-app="metabase"]`, `[data-app="ga4"]`, `[data-app="clarity"]`) para que los estilos no se mezclen.
- **Radix UI** (vía shadcn/ui) solo como primitivas de comportamiento (popover, dropdown, dialog, tabs, tooltip, select, checkbox). Restilízalas completamente con el look de cada herramienta; nunca dejes el estilo default de shadcn visible.
- **Apache ECharts** (`echarts` + `echarts-for-react`) para todos los gráficos: combinados barra+línea con labels, áreas, apiladas, donuts, medidor, mapa mundial de GA4. Configura un tema ECharts por app.
- **Heatmaps**: render propio en `<canvas>` (o `simpleheat`) con gradiente azul → cian → verde → amarillo → rojo, como Clarity.
- **Estado**: Zustand por app (filtros, rango de fechas, segmentos, comparaciones, desglose) sincronizado con la URL mediante **nuqs**, para que cualquier vista sea compartible y los casos puedan abrir vistas pre-filtradas.
- **Datos**: generador determinista con semilla (PRNG propio tipo mulberry32; prohibido `Math.random`) + `date-fns`. **Zod** para validar definiciones de casos.
- **Tipografías**: Metabase → Lato; GA4 → Roboto (como sustituto cercano de Google Sans) ; Clarity → "Segoe UI" con fallback a Selawik/system-ui. Carga con `next/font`.
- **Tests**: Vitest (generador, métricas y aserciones de casos) y Playwright (smoke de rutas + capturas para comparar con `reference/`).
- **Gestor de paquetes**: pnpm.
- **Deploy**: Vercel. No hay backend ni base de datos ni variables de entorno. El progreso de casos se guarda en `localStorage`.

## 4. Estructura de carpetas

```
src/
  app/
    page.tsx                      # Hub: elegir app o caso
    casos/page.tsx                # Catálogo de casos (filtros por app, dificultad, tipo de problema)
    casos/[caseId]/page.tsx       # Arranca un caso: redirige a la vista inicial con ?case=ID
    metabase/...                  # Rutas de Metabase
    ga4/...                       # Rutas de GA4
    clarity/...                   # Rutas de Clarity
  apps/
    metabase/  (components/, views/, theme.css, echarts-theme.ts, store.ts)
    ga4/       (idem)
    clarity/   (idem + heatmap/, replay/)
  data/
    universe.ts                   # Catálogos: canales, campañas, dispositivos, navegadores, SO, sectores, ciudades, páginas, eventos
    clock.ts                      # "Hoy" simulado fijo
    generator.ts                  # Sesiones y embudo CRM sintéticos
    scenarios/                    # Un archivo por problema inyectado
    queries/                      # Agregaciones: series por día/semana, por dimensión, embudos, CVR, puntos de calor
  cases/
    schema.ts                     # Zod
    registry.ts
    mb-01.ts ... cl-03.ts
    engine/                       # Detección de pasos, pistas, scoring, progreso
  components/shared/              # CaseDock (panel de misión), AppSwitcher, SimulatorBadge
tests/
reference/                        # Capturas (ignorado por git)
```

### Rutas mínimas

- `/` hub con tarjetas grandes de cada app y acceso a casos.
- Metabase: `/metabase/dashboard/growth-full-picture` (tabs vía `?tab=growth|supply|dev`).
- GA4: `/ga4/informes/panoramico`, `/ga4/informes/adquisicion-trafico`, `/ga4/informes/eventos`, `/ga4/informes/eventos/[eventName]`, `/ga4/informes/paginas`, `/ga4/explorar/embudo`.
- Clarity: `/clarity/panel`, `/clarity/grabaciones`, `/clarity/grabaciones/[id]`, `/clarity/mapas-termicos`.
- Un selector global (discreto, fuera del chrome de la app) permite saltar entre apps y volver al hub.

## 5. Modelo de datos ficticio

Un **único universo** compartido por las tres apps, para que en el futuro existan casos cruzados (ej. el problema se ve en GA4 y se explica en Clarity).

- **Reloj**: "hoy" simulado fijo (constante en `clock.ts`). Periodo generado: 180 días hacia atrás. Mismo seed = mismos números siempre.
- **Sesión** (~40–60 mil sesiones; las UIs pueden aplicar un factor de escala configurable para que los volúmenes se vean realistas):
  `id, userId, isNewUser, startedAt, channel, source, medium, campaign, referrer, device (mobile|desktop|tablet), browser, os, country, city, landingPage, entryPoint (Home|Browse Page|Spot Detail|Blog|Complejo), sector, pageviews[], activeTimeSec, scrollDepthPct, events[], isBot, botType, flags {rageClick, deadClick, excessiveScroll, quickBack, jsError}`.
- **Canales**: Organic Search, Direct, Paid Search, Paid Social, Referral, Email, Organic Social, AI Assistants (chatgpt.com, perplexity). Referrers coherentes con cada canal.
- **Eventos** (nomenclatura camelCase tipo producto): `page_view, session_start, first_visit, user_engagement, scroll, clientAcceptedDefaultCookies, clientClickedSpotCardBrowsePage, clientInAvailableSpotDetail, clientOpenedLeadPopup, clientClosedLeadPopup, clientOpenedFilterPrice, clientAppliedFilterPrice, clientSearchedSpotSearch, clientClickedWhatsappForm, clientRequestedWhatsappForm, clientClickedContactLead, clientRequestedVisit, clientClickedRegisterForm`.
- **Páginas**: home, listados por sector y ciudad (`/locales-comerciales/renta/ciudad-de-mexico`, `/bodegas/renta`, `/oficinas/renta/...`, `/naves-industriales/...`), fichas `/spots/[slug]`, complejos, blog, landings `/iframe/...` para paid.
- **CRM (para Metabase)**: lead → project → request visit → confirmed visit → completed visit → LOI → contract → won. Atributos: leadType, priority (P0–P5), agentSource (CREX, NEXT, VIRTUAL), estatus y motivo de cancelación (Cancelada por cliente/inquilino, Espacio no adecuado – Presupuesto/Zona/Metraje/Características, Sin respuesta del cliente, Oferta no disponible, etc.), comisión y revenue esperado en MXN.
- **Puntos de calor (Clarity)**: se generan **por elemento** de la página simulada (id/selector + offset relativo), no por coordenadas absolutas, para que el mapa se alinee a cualquier ancho. Scroll como distribución de profundidad máxima por sesión. Atención como tiempo por franja vertical.
- **Grabaciones (Clarity)**: cada grabación es un guion derivado de una sesión (ruta del cursor, clics, scroll, rage/dead clicks, errores) que se reproduce animando un cursor sobre la página simulada, con línea de tiempo, velocidad, saltar inactividad y marcadores de eventos.

### Base sana + escenarios

El dataset base debe ser **realista y sin anomalías fuertes** (estacionalidad semanal, ruido, tendencias suaves). Cada problema es un **escenario**: un modificador que altera un slice concreto (dimensiones + rango de fechas) del universo. Los escenarios están **siempre activos** para que también se puedan descubrir en exploración libre, y se diseñan para **no pisarse** entre sí. Cada escenario exporta aserciones que los tests verifican.

### Definiciones de métricas (úsalas igual en todo el proyecto)

- CVR users → leads = leads / usuarios únicos del entry point filtrado.
- CVR leads → projects, projects → request visits: proporción en el mismo periodo de cohorte.
- Bounce rate (Metabase) = sesiones de una sola página sin interacción / sesiones.
- Tasa de interacción (GA4) = sesiones con interacción (≥10 s, ≥2 vistas o evento clave) / sesiones.
- Clics fallidos (Clarity) = sesiones con dead click / sesiones. Clics continuos = sesiones con rage click / sesiones. Retrocesos rápidos = sesiones que vuelven a la página anterior en < 5 s / sesiones.
- Formato numérico: Metabase en-US (`6,539`, `4.45%`); GA4 y Clarity es (`14.538`, `3,28`, `55,68 %`).

## 6. Casos iniciales (3 por app)

Cada caso vive en `src/cases/<id>.ts` y cumple el schema de Zod: `id, app, title, difficulty, problemType, businessContext, question, startRoute (con params), objectives[] (paso + detector sobre el estado/ruta), hints[3], quiz[] (opción múltiple y/o numérica con tolerancia), solution {diagnóstico, evidencia, hipótesis, siguiente acción, métrica a monitorear}, relatedCases[]`.

| ID | App | Título | Síntoma visible | Causa oculta | Dónde se descubre |
|---|---|---|---|---|---|
| MB-01 | Metabase | Mucho alcance, poca conversión | Usuarios de Browse Pages +45% en 4 semanas; leads casi planos; CVR users→leads cae de ~3,8% a ~1,9% | Una campaña paid ficticia de bodegas a nivel nacional trae tráfico de baja intención | Traffic Type = Paid → Campaign Name; comparar con orgánico (CVR estable) |
| MB-02 | Metabase | Cuello de botella después del lead | Leads y CVR leads→projects estables; CVR projects→request visits baja de ~30% a ~20% | En Sector = Naves industriales con Agent Source = VIRTUAL los proyectos no se agendan; sube "Sin respuesta del cliente/inquilino" | Filtros Sector y Agent Source; gráfico de cancelaciones |
| MB-03 | Metabase | La caída que no es caída | Usuarios caen ~65% desde una semana concreta; leads no caen y el bounce rate baja | Se activó la clasificación de bots (User Sospechoso): es un cambio de medición, no de negocio | Filtro User Sospechoso; comparar series con y sin él |
| GA-01 | GA4 | La ficha no convierte en desktop | Embudo BP → Click card → Ficha → Abre contacto: ficha→contacto ~7% total | Desglose por dispositivo: mobile ~11%, desktop ~1,5% | Explorar → Exploración de embudo, desglose Categoría de dispositivo |
| GA-02 | GA4 | Canal con volumen y sin intención | Sesiones +60% mes contra mes | Paid Social (campaña ficticia de awareness): tasa de interacción ~18%, tiempo medio ~9 s, eventos clave ≈ 0 | Adquisición de tráfico por grupo de canales → campaña de la sesión |
| GA-03 | GA4 | Conversión rota por tracking | `clientRequestedWhatsappForm` cae ~60% desde una fecha de release | Deja de dispararse en Safari / iOS mientras `clientClickedWhatsappForm` sigue normal | Informe Eventos → detalle de evento → dimensión secundaria Navegador / SO |
| CL-01 | Clarity | Clics fallidos en la galería | Ideas → Clics fallidos ~10% concentrado en `/spots/` | Los usuarios hacen clic en la foto principal y miniaturas esperando abrir la galería y no pasa nada | Mapa de calor de `/spots/` (Clic) + lista de elementos + grabaciones con clic fallido |
| CL-02 | Clarity | El contacto queda fuera de vista (desktop) | Profundidad de desplazamiento baja en fichas desktop | El panel de contacto no es sticky y queda tras una descripción larga: solo ~25% llega a verlo | Mapas térmicos → Desplazamiento y Atención, PC vs móvil con Comparar. Relacionado con GA-01 |
| CL-03 | Clarity | Rage clicks en el buscador | Clics continuos suben en mobile | El autocompletado "Buscar una ubicación" falla en Safari móvil con un error de JavaScript | Ideas → Clics continuos → filtro Explorador → grabaciones → tarjeta Errores de JavaScript |

Los números son objetivos aproximados: lo importante es que el síntoma sea visible en la vista inicial y la causa **solo aparezca al filtrar/segmentar correctamente**.

## 7. Reglas de interacción y fidelidad

- **Nada de botones muertos.** Todo control visible funciona. Si algo está fuera de alcance, muestra un tooltip "No disponible en el simulador".
- Los filtros, segmentos, comparaciones y rangos de fecha **recalculan desde el dataset**. Prohibido hardcodear números en componentes o usar imágenes de gráficos.
- Date pickers con los presets propios de cada herramienta (GA4: hoy, ayer, últimos 7/28/90 días, personalizado, comparar; Metabase: Previous N days/weeks/months, This month, específico; Clarity: último día, 3, 7, 30 días, personalizado).
- Tooltips de gráficos, hover de filas, ordenamiento de columnas, paginación y búsqueda en tablas como en cada herramienta.
- Skeletons breves (150–300 ms) al cambiar filtros para que se sienta real.
- Resolución objetivo: desktop 1440–1920 px; mínimo 1280 px. Mobile no es prioridad en esta etapa.
- Accesibilidad básica: foco visible, roles ARIA de Radix, contraste correcto.
- El panel de misión (CaseDock) es flotante, colapsable y no tapa el chrome principal de la app.

## 8. Comandos y definición de terminado

- `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e`.
- `pnpm shots`: script de Playwright que captura las rutas principales a `tests/__shots__/` para compararlas lado a lado con `reference/`.

Una tarea está terminada cuando: lint, typecheck, test y build pasan; las aserciones de los escenarios afectados pasan; tomaste capturas y comparaste visualmente contra `reference/` corrigiendo diferencias evidentes; y al final resumes qué hiciste, qué quedó pendiente y qué decisiones tomaste.

## 9. Cómo agregar un caso nuevo

1. Crea el escenario en `src/data/scenarios/` con su slice y sus aserciones (no debe pisar otros escenarios).
2. Crea `src/cases/<id>.ts` cumpliendo el schema y regístralo en `registry.ts`.
3. Agrega detectores de pasos si se necesitan nuevos estados de UI.
4. Agrega tests: el síntoma se ve en la vista inicial y la causa aparece con los filtros correctos.
5. Corre todo el checklist de la sección 8.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
