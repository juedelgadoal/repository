import type { IncidentStatus, Severity, VehicleStatus } from "./types";

export const SEVERITY_UI: Record<Severity, { label: string; color: string; bg: string; text: string }> = {
  baja: { label: "Baja", color: "#22c55e", bg: "bg-ok/15", text: "text-ok" },
  media: { label: "Media", color: "#eab308", bg: "bg-yellow-500/15", text: "text-yellow-400" },
  alta: { label: "Alta", color: "#f59e0b", bg: "bg-warn/15", text: "text-warn" },
  critica: { label: "Crítica", color: "#ef4444", bg: "bg-crit/15", text: "text-crit" },
};

export const STATUS_UI: Record<IncidentStatus, { label: string; color: string }> = {
  abierto: { label: "Abierto", color: "#3b82f6" },
  en_gestion: { label: "En gestión", color: "#22d3ee" },
  escalado: { label: "Escalado", color: "#ef4444" },
  resuelto: { label: "Resuelto", color: "#22c55e" },
};

export const VEHICLE_STATUS_UI: Record<VehicleStatus, { label: string; color: string }> = {
  en_ruta: { label: "En ruta", color: "#22c55e" },
  detenido: { label: "Detenido", color: "#f59e0b" },
  en_incidente: { label: "En incidente", color: "#ef4444" },
  descanso: { label: "En descanso", color: "#3b82f6" },
  finalizado: { label: "Finalizado", color: "#64748b" },
};
