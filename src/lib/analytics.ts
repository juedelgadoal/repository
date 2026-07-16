import { INCIDENT_TYPES } from "./domain";
import type { Incident, SimState } from "./types";

export function analytics(state: SimState) {
  const inc = state.incidents;
  const byCity = countBy(inc, (i) => state.cities.find((c) => c.id === i.cityId)?.name ?? "—");
  const byType = countBy(inc, (i) => INCIDENT_TYPES[i.type].label);
  const byCarrier = countBy(inc, (i) => {
    const v = state.vehicles.find((x) => x.id === i.vehicleId);
    return state.carriers.find((c) => c.id === v?.carrierId)?.name ?? "—";
  });
  const byRoute = countBy(inc, (i) => {
    const r = state.routes.find((r) => r.id === i.routeId);
    return (r?.name.split("·")[0] || r?.name || "—").trim();
  });
  const bySeverity = countBy(inc, (i) => i.severity);

  // incidents by hour of the simulated day
  const byHour: { hour: string; count: number; crit: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const items = inc.filter((i) => new Date(i.createdAt).getHours() === h);
    byHour.push({
      hour: `${String(h).padStart(2, "0")}h`,
      count: items.length,
      crit: items.filter((i) => i.severity === "critica" || i.severity === "alta").length,
    });
  }

  // heatmap: city (rows) x type (cols)
  const cities = [...new Set(inc.map((i) => state.cities.find((c) => c.id === i.cityId)?.name ?? "—"))];
  const types = Object.values(INCIDENT_TYPES).map((t) => t.label);
  const heat = cities.map((city) => ({
    city,
    cells: types.map((type) => ({
      type,
      value: inc.filter(
        (i) =>
          (state.cities.find((c) => c.id === i.cityId)?.name ?? "—") === city &&
          INCIDENT_TYPES[i.type].label === type
      ).length,
    })),
  }));

  const resolved = inc.filter((i) => i.status === "resuelto");
  const costGenerated = inc.reduce((s, i) => s + i.estimatedCostCop, 0);
  const costAvoided = resolved.reduce((s, i) => s + i.avoidedCostCop, 0);

  const history = state.history.map((h) => ({
    t: new Date(h.t).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }),
    sla: h.kpis.slaCompliance,
    otif: h.kpis.otif,
    contingencia: h.kpis.contingencyCompliance,
    costo: Math.round(h.kpis.costGeneratedCop / 1_000_000),
    evitado: Math.round(h.kpis.costAvoidedCop / 1_000_000),
  }));

  return {
    byCity: toArr(byCity),
    byType: toArr(byType),
    byCarrier: toArr(byCarrier).sort((a, b) => b.value - a.value),
    byRoute: toArr(byRoute).sort((a, b) => b.value - a.value).slice(0, 8),
    bySeverity: toArr(bySeverity),
    byHour,
    heat,
    types,
    total: inc.length,
    resolvedCount: resolved.length,
    costGenerated,
    costAvoided,
    history,
  };
}

function countBy<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of arr) {
    const k = key(x);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function toArr(rec: Record<string, number>) {
  return Object.entries(rec).map(([name, value]) => ({ name, value }));
}

export type Analytics = ReturnType<typeof analytics>;
