import type { IpiBreakdown, Severity } from "./types";

// ============================================================================
// Índice de Prioridad del Incidente (IPI) — 0..100.
// Blends the GEODIS severity model with the UCLOG Saaty/AHP weighting:
//   Personas/Seguridad 0.486 · SLA 0.240 · Cliente 0.180 · Sector 0.059 · Costo 0.031
// re-expressed over the 7 factors requested in the brief.
// ============================================================================

export const IPI_WEIGHTS = {
  severity: 0.3, // incluye seguridad / prioridad-vida
  slaUrgency: 0.22,
  clientPriority: 0.16,
  typeWeight: 0.12,
  routeRisk: 0.1,
  value: 0.06,
  kpiImpact: 0.04,
};

const SEV_SCORE: Record<Severity, number> = {
  baja: 25,
  media: 55,
  alta: 80,
  critica: 100,
};

export function slaUrgencyScore(minutesRemaining: number): number {
  if (minutesRemaining <= 0) return 100;
  if (minutesRemaining >= 180) return 8;
  return Math.round(100 - (minutesRemaining / 180) * 92);
}

export interface IpiInputs {
  severity: Severity;
  minutesToSla: number;
  typeWeight: number; // 0..1
  routeRisk: number; // 0..25
  clientPriority: number; // 0..100 (GUT)
  valueCop: number;
  affectedKpiCount: number;
  vetoSeguridad: boolean;
}

export function computeIpi(inp: IpiInputs): { ipi: number; breakdown: IpiBreakdown } {
  const breakdown: IpiBreakdown = {
    severity: SEV_SCORE[inp.severity],
    slaUrgency: slaUrgencyScore(inp.minutesToSla),
    typeWeight: Math.round(inp.typeWeight * 100),
    routeRisk: Math.round((inp.routeRisk / 25) * 100),
    clientPriority: Math.round(inp.clientPriority),
    value: Math.round(Math.min(100, (inp.valueCop / 50_000_000) * 100)),
    kpiImpact: Math.min(100, inp.affectedKpiCount * 33),
  };

  let ipi =
    breakdown.severity * IPI_WEIGHTS.severity +
    breakdown.slaUrgency * IPI_WEIGHTS.slaUrgency +
    breakdown.clientPriority * IPI_WEIGHTS.clientPriority +
    breakdown.typeWeight * IPI_WEIGHTS.typeWeight +
    breakdown.routeRisk * IPI_WEIGHTS.routeRisk +
    breakdown.value * IPI_WEIGHTS.value +
    breakdown.kpiImpact * IPI_WEIGHTS.kpiImpact;

  // Security veto dominates all three heuristics (H1/H2/H3).
  if (inp.vetoSeguridad) ipi = Math.max(ipi, 96);

  return { ipi: Math.round(Math.max(0, Math.min(100, ipi))), breakdown };
}

export function ipiBand(ipi: number): { label: string; color: string } {
  if (ipi >= 80) return { label: "Crítico", color: "#ef4444" };
  if (ipi >= 60) return { label: "Alto", color: "#f59e0b" };
  if (ipi >= 40) return { label: "Medio", color: "#eab308" };
  return { label: "Bajo", color: "#22c55e" };
}
