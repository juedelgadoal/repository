import { analytics } from "./analytics";
import { INCIDENT_TYPES } from "./domain";
import { copFull, copShort, fmtMin, pct } from "./format";
import type { SimState } from "./types";

export function buildReport(state: SimState) {
  const a = analytics(state);
  const k = state.kpis;
  const topType = [...a.byType].sort((x, y) => y.value - x.value)[0];
  const topCity = [...a.byCity].sort((x, y) => y.value - x.value)[0];
  const topRoute = a.byRoute[0];
  const topCarrier = a.byCarrier[0];

  const affectedClients = new Set(
    state.incidents.map((i) => {
      const v = state.vehicles.find((x) => x.id === i.vehicleId);
      const o = state.orders.find((o) => o.id === v?.orderId);
      return o?.clientId;
    })
  );
  const clientList = state.clients.filter((c) => affectedClients.has(c.id));

  // Automatic conclusions
  const conclusions: string[] = [];
  conclusions.push(
    `Se gestionaron ${a.total} incidentes durante la ventana de operación, de los cuales ${a.resolvedCount} fueron resueltos y cerrados por la torre de control.`
  );
  conclusions.push(
    k.slaCompliance >= 95
      ? `El cumplimiento de SLA se mantuvo saludable en ${pct(k.slaCompliance)}, por encima del umbral objetivo del 95%.`
      : `El cumplimiento de SLA se ubicó en ${pct(k.slaCompliance)}, por debajo del objetivo del 95%; los incidentes en corredores críticos son el principal factor de erosión.`
  );
  conclusions.push(
    `La gestión de contingencias evitó costos por ${copShort(k.costAvoidedCop)} frente a un impacto generado de ${copShort(k.costGeneratedCop)}, con un cumplimiento del plan de contingencia del ${pct(k.contingencyCompliance)}.`
  );
  if (topType) conclusions.push(`El tipo de incidente más frecuente fue "${topType.name}" y la ciudad con mayor incidencia fue ${topCity?.name}.`);
  conclusions.push(
    `El tiempo promedio de reacción fue de ${fmtMin(k.avgReactionMin)} y el de resolución de ${fmtMin(k.avgResolutionMin)}.`
  );

  // Automatic recommendations
  const recommendations: string[] = [];
  if (topRoute) recommendations.push(`Reforzar el monitoreo y pre-armar planes de contingencia en la ruta "${topRoute.name}", que concentra la mayor cantidad de incidentes.`);
  if (topCity) recommendations.push(`Coordinar con las autoridades y gremios en ${topCity.name} para mitigar bloqueos y eventos de seguridad recurrentes.`);
  recommendations.push("Aplicar la heurística H1 (ruta alterna de menor impacto) de forma anticipada en corredores con severidad Alta/Crítica.");
  recommendations.push("Priorizar la carga crítica (Healthcare/Tecnología) mediante H2 cuando la capacidad sea escasa.");
  if (topCarrier) recommendations.push(`Auditar el estándar de seguridad de la transportadora "${topCarrier.name}" y activar la base de transportadores alternos ante indisponibilidad.`);
  recommendations.push("Mantener el veto de seguridad como regla dominante: la integridad del conductor prevalece sobre cualquier objetivo de costo o SLA.");

  return {
    generatedAt: state.now,
    kpis: k,
    a,
    topType,
    topCity,
    topRoute,
    topCarrier,
    clientList,
    conclusions,
    recommendations,
    costGeneratedFull: copFull(k.costGeneratedCop),
    costAvoidedFull: copFull(k.costAvoidedCop),
  };
}

export type ReportData = ReturnType<typeof buildReport>;
