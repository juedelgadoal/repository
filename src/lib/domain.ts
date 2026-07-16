import type { City, IncidentType, LatLng } from "./types";

// ============================================================================
// Static reference data — grounded in the GEODIS risk matrix (Colombian
// corridors) and the UCLOG prioritization / incident database.
// All figures are fictitious but consistent with a real ground-transport op.
// ============================================================================

export const CITIES: City[] = [
  { id: "bog", name: "Bogotá", regional: "Centro", coord: [4.711, -74.0721], riskZone: false },
  { id: "bun", name: "Buenaventura", regional: "Pacífico", coord: [3.8801, -77.0313], riskZone: true },
  { id: "cal", name: "Cali", regional: "Suroccidente", coord: [3.4516, -76.532], riskZone: true },
  { id: "ctg", name: "Cartagena", regional: "Caribe", coord: [10.391, -75.4794], riskZone: false },
  { id: "med", name: "Medellín", regional: "Antioquia", coord: [6.2442, -75.5812], riskZone: false },
  { id: "ipi", name: "Ipiales", regional: "Nariño", coord: [0.8303, -77.645], riskZone: true },
  { id: "vil", name: "Villavicencio", regional: "Llanos", coord: [4.142, -73.6266], riskZone: true },
  { id: "baq", name: "Barranquilla", regional: "Caribe", coord: [10.9685, -74.7813], riskZone: false },
];

export const cityById = (id: string) => CITIES.find((c) => c.id === id)!;

// Corridor polylines (approximate real highway paths) --------------------------
export const CORRIDORS: Record<
  string,
  { name: string; corridor: "A" | "B" | "C" | "T" | "U"; path: LatLng[]; risk: number; riskLabel: string; critical: boolean }
> = {
  A_bun_bog: {
    name: "Corredor A · Buenaventura–Bogotá",
    corridor: "A",
    path: [
      [3.8801, -77.0313],
      [3.7203, -76.7223],
      [3.901, -76.3016],
      [4.437, -75.2322],
      [4.4389, -75.2],
      [4.711, -74.0721],
    ],
    risk: 15.2,
    riskLabel: "Bloqueo social recurrente · saqueo en congestión",
    critical: true,
  },
  B_ctg_bog: {
    name: "Corredor B · Cartagena–Bogotá",
    corridor: "B",
    path: [
      [10.391, -75.4794],
      [9.3047, -75.3978],
      [8.7554, -75.8814],
      [5.9, -74.65],
      [5.1974, -74.7399],
      [4.711, -74.0721],
    ],
    risk: 16,
    riskLabel: "Piratería terrestre · Magdalena Medio",
    critical: true,
  },
  C_cal_ipi: {
    name: "Corredor C · Cali–Rumichaca",
    corridor: "C",
    path: [
      [3.4516, -76.532],
      [3.0089, -76.4848],
      [2.4448, -76.6147],
      [1.2136, -77.2811],
      [0.8303, -77.645],
    ],
    risk: 15,
    riskLabel: "VETO seguridad · terrorismo / robo armado (Cauca–Nariño)",
    critical: true,
  },
  T_bog_vil: {
    name: "Transversal · Bogotá–Villavicencio (vía al Llano)",
    corridor: "T",
    path: [
      [4.711, -74.0721],
      [4.4979, -73.9532],
      [4.2072, -73.7538],
      [4.142, -73.6266],
    ],
    risk: 9.9,
    riskLabel: "Derrumbes / clima · calzada sencilla",
    critical: false,
  },
  T_bog_med: {
    name: "Transversal · Bogotá–Medellín (autopista)",
    corridor: "T",
    path: [
      [4.711, -74.0721],
      [5.1974, -74.7399],
      [5.8, -75.1],
      [6.2802, -75.4407],
      [6.2442, -75.5812],
    ],
    risk: 8.0,
    riskLabel: "Accidentalidad · Guarne",
    critical: false,
  },
  A_cal_bog: {
    name: "Corredor A · Cali–Bogotá",
    corridor: "A",
    path: [
      [3.4516, -76.532],
      [3.901, -76.3016],
      [4.437, -75.2322],
      [4.4389, -75.0],
      [4.711, -74.0721],
    ],
    risk: 12.5,
    riskLabel: "Congestión / cuello de botella",
    critical: true,
  },
  B_baq_bog: {
    name: "Corredor B · Barranquilla–Bogotá",
    corridor: "B",
    path: [
      [10.9685, -74.7813],
      [9.3047, -75.3978],
      [7.1254, -73.1198],
      [5.5353, -73.3677],
      [4.711, -74.0721],
    ],
    risk: 9.2,
    riskLabel: "Infraestructura / calzada sencilla",
    critical: false,
  },
  U_bog_urban: {
    name: "Última milla · Bogotá urbano",
    corridor: "U",
    path: [
      [4.711, -74.0721],
      [4.65, -74.1],
      [4.68, -74.14],
      [4.74, -74.06],
      [4.711, -74.0721],
    ],
    risk: 7.2,
    riskLabel: "Congestión urbana · pico y placa / ZBE",
    critical: false,
  },
  U_med_urban: {
    name: "Última milla · Medellín urbano",
    corridor: "U",
    path: [
      [6.2442, -75.5812],
      [6.2, -75.56],
      [6.27, -75.6],
      [6.29, -75.54],
      [6.2442, -75.5812],
    ],
    risk: 6.9,
    riskLabel: "Última milla · clima",
    critical: false,
  },
};

export const CORRIDOR_KEYS = Object.keys(CORRIDORS);

// Client lines with GUT-based priority (Medicina 75, Tecnología 60, Retail 27,
// Consumo 12, Automotriz 8) normalized to 0-100.
export const CLIENT_LINES: { line: string; gut: number; critical: boolean }[] = [
  { line: "Healthcare", gut: 75, critical: true },
  { line: "Tecnología", gut: 60, critical: true },
  { line: "Retail", gut: 27, critical: false },
  { line: "Consumo Masivo", gut: 12, critical: false },
  { line: "Automotriz", gut: 8, critical: false },
];

export const CLIENT_NAMES = [
  "NovaSalud Pharma",
  "MediCol Distribución",
  "TecnoAndina S.A.",
  "ByteLogic Colombia",
  "RetailMax",
  "Almacenes Vértice",
  "ConsumoTotal",
  "AbastecerCo",
  "AutoPartes del Valle",
  "MotorTech Andino",
  "FreshMarket",
  "VitalCare Labs",
  "GlobalChip Import",
  "HogarPlus Retail",
  "NutriConsumo",
];

export const CARRIER_NAMES = [
  "TransAndes Carga",
  "Rutas del Pacífico",
  "Coltrans Nacional",
  "Expreso Bolivariano Cargo",
  "LogiSur Transportes",
  "Caribe Express",
  "Andina Freight",
  "TransMagdalena",
  "Cordillera Logística",
  "Pacífico Seguro Carga",
];

export const MERCHANDISE = [
  "Medicamentos refrigerados",
  "Dispositivos médicos",
  "Servidores y equipos TI",
  "Smartphones",
  "Electrodomésticos",
  "Repuestos automotrices",
  "Alimentos no perecederos",
  "Bebidas",
  "Textiles y calzado",
  "Cosméticos",
  "Autopartes OEM",
  "Insumos hospitalarios",
];

export const DRIVER_FIRST = [
  "Carlos", "Andrés", "Jorge", "Luis", "Fernando", "Diego", "Miguel", "Óscar",
  "Javier", "Ricardo", "Camilo", "Héctor", "Wilson", "Alberto", "Mauricio",
  "Julián", "Édgar", "Nelson", "Rubén", "Fabián",
];
export const DRIVER_LAST = [
  "Rodríguez", "Gómez", "Martínez", "López", "Hernández", "Ramírez", "Torres",
  "Vargas", "Castro", "Ospina", "Quintero", "Moreno", "Rojas", "Cárdenas",
  "Mejía", "Restrepo", "Guerrero", "Peña", "Salazar", "Correa",
];

// Incident type catalog — severity distribution, cost, KPIs, contingency plan.
export interface IncidentTypeMeta {
  type: IncidentType;
  label: string;
  icon: string; // lucide name
  color: string;
  lifePriority: boolean; // security veto family — "prioridad vida"
  sevWeights: { v: "baja" | "media" | "alta" | "critica"; w: number }[];
  baseCost: [number, number];
  reactionTargetMin: number;
  affectedKpis: string[];
  plan: string; // recommended contingency plan
  typeWeight: number; // 0-1 for IPI
}

export const INCIDENT_TYPES: Record<IncidentType, IncidentTypeMeta> = {
  hurto: {
    type: "hurto",
    label: "Hurto / Piratería",
    icon: "ShieldAlert",
    color: "#ef4444",
    lifePriority: true,
    sevWeights: [{ v: "alta", w: 3 }, { v: "critica", w: 4 }],
    baseCost: [4_700_000, 18_000_000],
    reactionTargetMin: 5,
    affectedKpis: ["Costo generado", "SLA", "Seguridad"],
    plan: "PRIORIDAD VIDA · no resistir · H1 reruteo seguro",
    typeWeight: 1.0,
  },
  accidente: {
    type: "accidente",
    label: "Accidente",
    icon: "TriangleAlert",
    color: "#f97316",
    lifePriority: true,
    sevWeights: [{ v: "media", w: 2 }, { v: "alta", w: 3 }, { v: "critica", w: 1 }],
    baseCost: [2_500_000, 9_000_000],
    reactionTargetMin: 8,
    affectedKpis: ["SLA", "Tiempo resolución", "Costo generado"],
    plan: "Atención en sitio · H1 ruta alterna",
    typeWeight: 0.85,
  },
  bloqueo_vial: {
    type: "bloqueo_vial",
    label: "Bloqueo vial",
    icon: "Ban",
    color: "#eab308",
    lifePriority: false,
    sevWeights: [{ v: "media", w: 3 }, { v: "alta", w: 3 }],
    baseCost: [1_500_000, 6_000_000],
    reactionTargetMin: 12,
    affectedKpis: ["SLA", "OTIF", "Tiempo resolución"],
    plan: "Activar SOP · H1 ruta alterna · H2 priorizar carga",
    typeWeight: 0.8,
  },
  manifestacion: {
    type: "manifestacion",
    label: "Manifestación / Paro",
    icon: "Megaphone",
    color: "#f59e0b",
    lifePriority: false,
    sevWeights: [{ v: "media", w: 2 }, { v: "alta", w: 3 }],
    baseCost: [1_800_000, 7_500_000],
    reactionTargetMin: 12,
    affectedKpis: ["SLA", "OTIF", "Costo generado"],
    plan: "Detener despachos al tramo · H1/H3 multimodal",
    typeWeight: 0.78,
  },
  desvio_ruta: {
    type: "desvio_ruta",
    label: "Desvío de ruta",
    icon: "Route",
    color: "#a855f7",
    lifePriority: false,
    sevWeights: [{ v: "baja", w: 2 }, { v: "media", w: 3 }, { v: "alta", w: 1 }],
    baseCost: [600_000, 3_000_000],
    reactionTargetMin: 10,
    affectedKpis: ["SLA", "Seguridad"],
    plan: "Confirmar causa · verificar geocerca · contactar conductor",
    typeWeight: 0.6,
  },
  parada_no_autorizada: {
    type: "parada_no_autorizada",
    label: "Parada no autorizada",
    icon: "OctagonPause",
    color: "#f59e0b",
    lifePriority: false,
    sevWeights: [{ v: "baja", w: 2 }, { v: "media", w: 3 }],
    baseCost: [300_000, 1_800_000],
    reactionTargetMin: 15,
    affectedKpis: ["SLA", "Seguridad"],
    plan: "Contactar conductor · confirmar ubicación",
    typeWeight: 0.5,
  },
  perdida_gps: {
    type: "perdida_gps",
    label: "Pérdida de GPS",
    icon: "SatelliteDish",
    color: "#3b82f6",
    lifePriority: false,
    sevWeights: [{ v: "baja", w: 2 }, { v: "media", w: 3 }, { v: "alta", w: 1 }],
    baseCost: [200_000, 1_500_000],
    reactionTargetMin: 15,
    affectedKpis: ["Seguridad", "Tiempo reacción"],
    plan: "Confirmar señal · contactar conductor · monitoreo reforzado",
    typeWeight: 0.55,
  },
  falla_mecanica: {
    type: "falla_mecanica",
    label: "Falla mecánica",
    icon: "Wrench",
    color: "#94a3b8",
    lifePriority: false,
    sevWeights: [{ v: "baja", w: 2 }, { v: "media", w: 3 }, { v: "alta", w: 1 }],
    baseCost: [500_000, 3_500_000],
    reactionTargetMin: 12,
    affectedKpis: ["SLA", "Tiempo resolución"],
    plan: "Asistencia en vía · unidad de reemplazo",
    typeWeight: 0.5,
  },
  retraso: {
    type: "retraso",
    label: "Retraso",
    icon: "Clock",
    color: "#eab308",
    lifePriority: false,
    sevWeights: [{ v: "baja", w: 3 }, { v: "media", w: 2 }],
    baseCost: [200_000, 1_200_000],
    reactionTargetMin: 15,
    affectedKpis: ["SLA", "OTIF"],
    plan: "Reprogramar ventana · notificar cliente",
    typeWeight: 0.4,
  },
  clima: {
    type: "clima",
    label: "Condiciones climáticas",
    icon: "CloudRain",
    color: "#38bdf8",
    lifePriority: false,
    sevWeights: [{ v: "baja", w: 2 }, { v: "media", w: 3 }, { v: "alta", w: 1 }],
    baseCost: [400_000, 2_500_000],
    reactionTargetMin: 12,
    affectedKpis: ["SLA", "Tiempo resolución"],
    plan: "Monitoreo INVÍAS · H1 ruta alterna · buffers",
    typeWeight: 0.5,
  },
};

export const INCIDENT_TYPE_LIST = Object.values(INCIDENT_TYPES);

// Map decoration points (peajes, descanso, clima, bloqueos, zonas de riesgo)
export interface MapPoi {
  id: string;
  kind: "peaje" | "descanso" | "clima" | "bloqueo" | "riesgo";
  label: string;
  coord: LatLng;
}

export const MAP_POIS: MapPoi[] = [
  { id: "p1", kind: "peaje", label: "Peaje Loboguerrero", coord: [3.72, -76.72] },
  { id: "p2", kind: "peaje", label: "Peaje Chinchiná", coord: [4.98, -75.6] },
  { id: "p3", kind: "peaje", label: "Peaje Siberia", coord: [4.74, -74.16] },
  { id: "d1", kind: "descanso", label: "Zona de descanso Buga", coord: [3.9, -76.3] },
  { id: "d2", kind: "descanso", label: "Zona de descanso Honda", coord: [5.2, -74.74] },
  { id: "d3", kind: "descanso", label: "Zona de descanso Popayán", coord: [2.44, -76.61] },
  { id: "c1", kind: "clima", label: "Lluvias — vía al Llano", coord: [4.35, -73.83] },
  { id: "c2", kind: "clima", label: "Neblina — Línea", coord: [4.5, -75.4] },
  { id: "b1", kind: "bloqueo", label: "Bloqueo social — Cauca", coord: [2.7, -76.55] },
  { id: "b2", kind: "bloqueo", label: "Congestión — Buga-Bvtura", coord: [3.8, -76.6] },
  { id: "r1", kind: "riesgo", label: "Corredor crítico — Quilichao/El Patía", coord: [3.0, -76.5] },
  { id: "r2", kind: "riesgo", label: "Punto caliente — Magdalena Medio", coord: [6.5, -74.6] },
  { id: "r3", kind: "riesgo", label: "Zona alto riesgo — Ipiales/Rumichaca", coord: [0.83, -77.64] },
];

// Contingency checklist template (interactive, auto-checked by rules).
export const CHECKLIST_TEMPLATE: { id: string; label: string; auto: boolean }[] = [
  { id: "contact_driver", label: "Contactar conductor", auto: true },
  { id: "confirm_location", label: "Confirmar ubicación", auto: true },
  { id: "contact_carrier", label: "Contactar transportadora", auto: true },
  { id: "inform_client", label: "Informar cliente", auto: true },
  { id: "escalate", label: "Escalar incidente", auto: false },
  { id: "register_evidence", label: "Registrar evidencia", auto: false },
  { id: "close_incident", label: "Cerrar incidente", auto: false },
];
