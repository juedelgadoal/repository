# Control Tower Inteligente · Gestión de Contingencias Logísticas

MVP de una **torre de control logística inteligente** inspirada en la operación de
GEODIS. No es solo un dashboard: es una **aplicación web interactiva que simula una
operación de transporte terrestre en tiempo real** (minuto a minuto) para demostrar,
de punta a punta, la detección de incidentes, la generación de alertas, la
priorización mediante un **Índice de Prioridad del Incidente (IPI)**, la recomendación
del plan de contingencia y el impacto operativo.

> ⚠️ **Toda la información es simulada** mediante datos ficticios, consistentes con una
> operación real. No se utilizan datos reales.

## Stack

- **Next.js 14** (App Router) · **React 18** · **TypeScript**
- **Tailwind CSS** — Dark Theme profesional, diseño responsive
- **Leaflet / react-leaflet** — mapa operacional interactivo
- **Recharts** — analítica
- **jsPDF** — reporte ejecutivo en PDF
- **Zustand** — motor de simulación en vivo
- Arquitectura modular y componentes reutilizables, preparada para integrar
  posteriormente APIs reales del **TMS** y una **matriz de riesgos corporativa**.

## Puesta en marcha

```bash
npm install
npm run dev      # http://localhost:3000
# producción
npm run build && npm run start
```

## Módulos

1. **Centro de Control** (`/control`) — mapa interactivo (~60%), KPIs superiores,
   panel de alertas dinámico, tabla inferior de incidentes priorizada por IPI,
   cronómetros permanentes y estado general de la operación.
2. **Gestión del Incidente** (`/incidentes` + panel lateral) — al hacer clic sobre
   un incidente se abre el detalle: información del vehículo, línea de tiempo,
   checklist del plan de contingencia (auto-marcado por reglas), bitácora de
   comunicaciones, historial de acciones, IPI y su descomposición, costos y KPIs
   afectados.
3. **Analítica** (`/analitica`) — incidentes por ciudad/tipo/transportadora/ruta,
   cumplimiento SLA, costos generado/evitado, tiempos de reacción/resolución,
   horarios críticos y **mapa de calor**.
4. **Reporte Ejecutivo** (`/reporte`) — genera un **PDF** con resumen, KPIs,
   incidentes, costos, clientes afectados, cumplimiento SLA y del plan de
   contingencia, **conclusiones y recomendaciones automáticas**.

## Simulación

Al abrir la app se genera automáticamente una operación viva:

- ~80 vehículos · 15 clientes · 10 transportadoras · 120 pedidos · 25 rutas ·
  20 conductores · 8 ciudades.
- Los vehículos se **mueven sobre el mapa** y el estado se **actualiza cada pocos
  segundos** (reloj de operación acelerado; velocidad 15×/45×/120× y pausa).
- Aparecen incidentes de forma aleatoria: pérdida de GPS, parada no autorizada,
  accidente, desvío de ruta, bloqueo vial, falla mecánica, hurto, manifestación,
  retraso y condiciones climáticas.

### Reglas automáticas de negocio

- Detenido > 15 min → **alerta**.
- Pérdida de GPS > 15 min → **crea incidente**.
- Desvío > 2 km → **clasifica como desvío**.
- Tiempo de reacción > 15 min → **escala**.
- SLA próximo a vencer → **incrementa la prioridad** automáticamente.

### Índice de Prioridad del Incidente (IPI)

Se calcula dinámicamente (0–100) ponderando severidad, urgencia del SLA, tipo de
incidente, riesgo de la ruta, prioridad del cliente, valor de la mercancía e impacto
en KPIs. La cola de incidentes se **ordena automáticamente** por IPI. El **veto de
seguridad** (prioridad vida) domina sobre las heurísticas de respuesta.

## Fundamento del dominio

Los datos ficticios están calibrados con marcos logísticos reales de referencia:

- **Corredores colombianos** y matriz de riesgo (bandas de severidad
  Probabilidad × Impacto, veto de seguridad).
- **Heurísticas de respuesta H1/H2/H3** (ruta alterna · priorización de carga ·
  multimodal) — la seguridad del conductor domina las tres.
- **Priorización de líneas** (GUT) y ponderación **Saaty/AHP** para el IPI.

## Estructura

```
src/
  app/                 # rutas (control, incidentes, analitica, reporte)
  components/
    layout/            # shell, sidebar, topbar, navegación
    control/           # mapa, KPIs, alertas, tabla de incidentes
    incident/          # panel de gestión del incidente
    analytics/         # gráficos y mapa de calor
    ui/                # primitivas reutilizables
  lib/                 # tipos, dominio, geo, IPI, simulación, PDF, formato
  store/               # motor de simulación (Zustand)
```
