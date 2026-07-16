// ============================================================================
// Domain types for the Control Tower Inteligente
// ============================================================================

export type LatLng = [number, number];

export type Severity = "baja" | "media" | "alta" | "critica";

export type IncidentStatus = "abierto" | "en_gestion" | "escalado" | "resuelto";

export type VehicleStatus =
  | "en_ruta"
  | "detenido"
  | "en_incidente"
  | "descanso"
  | "finalizado";

export type IncidentType =
  | "perdida_gps"
  | "parada_no_autorizada"
  | "accidente"
  | "desvio_ruta"
  | "bloqueo_vial"
  | "falla_mecanica"
  | "hurto"
  | "manifestacion"
  | "retraso"
  | "clima";

export interface City {
  id: string;
  name: string;
  regional: string;
  coord: LatLng;
  riskZone: boolean;
}

export interface Client {
  id: string;
  name: string;
  line: string; // Healthcare / Tecnología / Consumo / Retail / Automotriz
  priorityScore: number; // GUT-based (0-100)
  critical: boolean;
}

export interface Carrier {
  id: string;
  name: string;
  securityStandard: number; // 1-5
  slaCompliance: number; // 0-1 baseline
}

export interface RouteDef {
  id: string;
  name: string;
  corridor: "A" | "B" | "C" | "T" | "U"; // Buenaventura, Cartagena, Rumichaca, Transversal, Urbano
  originCityId: string;
  destCityId: string;
  waypoints: LatLng[];
  distanceKm: number;
  riskLevel: number; // 1-25 (from risk matrix severity)
  riskLabel: string;
  criticalCorridor: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
}

export interface Order {
  id: string; // Número de guía
  clientId: string;
  merchandise: string;
  weightKg: number;
  valueCop: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  driverId: string;
  carrierId: string;
  routeId: string;
  orderId: string;
  progress: number; // 0..1 along route
  speedKmh: number;
  coord: LatLng;
  heading: number;
  status: VehicleStatus;
  stoppedSince: number | null; // epoch ms
  gpsLostSince: number | null;
  deviationKm: number;
  etaMin: number;
  slaDeadline: number; // epoch ms
  incidentId: string | null;
  departedAt: number;
}

export interface TimelineEvent {
  id: string;
  t: number; // epoch ms
  label: string;
  kind: "system" | "action" | "alert" | "comm" | "escalation";
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  auto: boolean; // gets auto-checked by simulation
  doneAt: number | null;
  by: string | null;
}

export type CommKind = "llamada" | "correo" | "comentario" | "archivo" | "foto";

export interface CommEntry {
  id: string;
  kind: CommKind;
  from: string;
  content: string;
  t: number;
}

export interface Incident {
  id: string;
  type: IncidentType;
  vehicleId: string;
  routeId: string;
  cityId: string;
  coord: LatLng;
  severity: Severity;
  status: IncidentStatus;
  createdAt: number;
  detectedAt: number;
  reactedAt: number | null; // when an agent/auto first acted
  resolvedAt: number | null;
  slaDeadline: number;
  ipi: number; // 0-100 priority index
  ipiBreakdown: IpiBreakdown;
  estimatedCostCop: number;
  avoidedCostCop: number;
  affectedKpis: string[];
  timeline: TimelineEvent[];
  checklist: ChecklistItem[];
  comms: CommEntry[];
  contingencyPlan: string; // recommended plan (H1/H2/H3/VETO)
  escalated: boolean;
  vetoSeguridad: boolean;
}

export interface IpiBreakdown {
  severity: number;
  slaUrgency: number;
  typeWeight: number;
  routeRisk: number;
  clientPriority: number;
  value: number;
  kpiImpact: number;
}

export interface Alert {
  id: string;
  t: number;
  level: "info" | "warn" | "crit";
  title: string;
  detail: string;
  incidentId: string | null;
  vehicleId: string | null;
  read: boolean;
}

export interface Kpis {
  slaCompliance: number; // %
  costGeneratedCop: number;
  costAvoidedCop: number;
  avgReactionMin: number;
  avgResolutionMin: number;
  contingencyCompliance: number; // %
  activeVehicles: number;
  openIncidents: number;
  criticalIncidents: number;
  otif: number;
}

export interface SimState {
  now: number;
  running: boolean;
  speed: number; // simulation multiplier
  cities: City[];
  clients: Client[];
  carriers: Carrier[];
  routes: RouteDef[];
  drivers: Driver[];
  orders: Order[];
  vehicles: Vehicle[];
  incidents: Incident[];
  alerts: Alert[];
  kpis: Kpis;
  selectedIncidentId: string | null;
  selectedVehicleId: string | null;
  history: { t: number; kpis: Kpis }[];
}
