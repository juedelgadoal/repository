import {
  ALT_ROUTES,
  CARRIER_NAMES,
  CITIES,
  CLIENT_LINES,
  CLIENT_NAMES,
  CORRIDORS,
  CORRIDOR_KEYS,
  DRIVER_FIRST,
  DRIVER_LAST,
  INCIDENT_TYPES,
  MERCHANDISE,
  TRAMOS,
  cityById,
} from "./domain";
import { buildChecklist, checklistCompletion, AGENTS } from "./contingency";
import { haversine, pointAlong, polylineLength } from "./geo";
import { computeIpi } from "./ipi";
import { makeRng, type Rng } from "./rng";
import type {
  Alert,
  Carrier,
  Client,
  Driver,
  Incident,
  IncidentType,
  Kpis,
  LatLng,
  Order,
  RouteDef,
  Severity,
  SimState,
  Tramo,
  Vehicle,
} from "./types";

const MIN = 60_000; // one sim-minute in ms
const START = new Date("2026-07-16T06:00:00").getTime();

let uid = 0;
const nid = (p: string) => `${p}-${(++uid).toString(36)}`;

// Corridor endpoint city mapping ------------------------------------------------
const CORRIDOR_CITIES: Record<string, [string, string]> = {
  A_bun_bog: ["bun", "bog"],
  B_ctg_bog: ["ctg", "bog"],
  C_cal_ipi: ["cal", "ipi"],
  T_bog_vil: ["bog", "vil"],
  T_bog_med: ["bog", "med"],
  A_cal_bog: ["cal", "bog"],
  B_baq_bog: ["baq", "bog"],
  U_bog_urban: ["bog", "bog"],
  U_med_urban: ["med", "med"],
};

function buildTramos(key: string, path: LatLng[]): Tramo[] {
  const defs = TRAMOS[key] ?? [];
  const segs = Math.max(1, path.length - 1);
  return defs.map((t, idx) => {
    const a = path[Math.min(idx, path.length - 1)];
    const b = path[Math.min(idx + 1, path.length - 1)];
    return {
      name: t.name,
      crit: t.crit,
      mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as LatLng,
      frac: (idx + 0.5) / segs,
    };
  });
}

function buildRoutes(): RouteDef[] {
  const routes: RouteDef[] = [];
  let i = 0;
  for (const key of CORRIDOR_KEYS) {
    const c = CORRIDORS[key];
    const [o, d] = CORRIDOR_CITIES[key];
    routes.push({
      id: `R${String(++i).padStart(2, "0")}`,
      name: c.name,
      corridor: c.corridor,
      corridorKey: key,
      originCityId: o,
      destCityId: d,
      waypoints: c.path,
      altWaypoints: ALT_ROUTES[key],
      tramos: buildTramos(key, c.path),
      distanceKm: Math.round(polylineLength(c.path)),
      riskLevel: c.risk,
      riskLabel: c.riskLabel,
      criticalCorridor: c.critical,
    });
    if (o !== d) {
      const rev = [...c.path].reverse();
      routes.push({
        id: `R${String(++i).padStart(2, "0")}`,
        name: c.name.replace("–", "→ inverso –"),
        corridor: c.corridor,
        corridorKey: key,
        originCityId: d,
        destCityId: o,
        waypoints: rev,
        altWaypoints: ALT_ROUTES[key] ? [...ALT_ROUTES[key]].reverse() : undefined,
        tramos: buildTramos(key, rev),
        distanceKm: Math.round(polylineLength(rev)),
        riskLevel: c.risk * 0.95,
        riskLabel: c.riskLabel,
        criticalCorridor: c.critical,
      });
    }
  }
  while (routes.length < 25) {
    const src = routes[routes.length % CORRIDOR_KEYS.length];
    routes.push({ ...src, id: `R${String(++i).padStart(2, "0")}`, name: `${src.name} · turno ${routes.length}` });
  }
  return routes.slice(0, 25);
}

function buildClients(rng: Rng): Client[] {
  return CLIENT_NAMES.map((name, idx) => {
    const line = CLIENT_LINES[idx % CLIENT_LINES.length];
    return {
      id: `CL${String(idx + 1).padStart(2, "0")}`,
      name,
      line: line.line,
      priorityScore: Math.min(100, (line.gut / 75) * 100),
      critical: line.critical,
    };
  });
}

function buildCarriers(rng: Rng): Carrier[] {
  return CARRIER_NAMES.map((name, idx) => ({
    id: `TR${String(idx + 1).padStart(2, "0")}`,
    name,
    securityStandard: rng.int(2, 5),
    slaCompliance: rng.range(0.9, 0.99),
  }));
}

function buildDrivers(rng: Rng): Driver[] {
  const out: Driver[] = [];
  for (let i = 0; i < 20; i++) {
    out.push({
      id: `DR${String(i + 1).padStart(2, "0")}`,
      name: `${rng.pick(DRIVER_FIRST)} ${rng.pick(DRIVER_LAST)}`,
      phone: `+57 3${rng.int(10, 24)} ${rng.int(100, 999)} ${rng.int(1000, 9999)}`,
      rating: Number(rng.range(3.8, 5).toFixed(1)),
    });
  }
  return out;
}

function buildOrders(rng: Rng, clients: Client[]): Order[] {
  const out: Order[] = [];
  for (let i = 0; i < 120; i++) {
    const client = rng.pick(clients);
    const valueBase = client.critical ? rng.range(8_000_000, 55_000_000) : rng.range(2_000_000, 22_000_000);
    out.push({
      id: `G-${2026}${String(rng.int(10000, 99999))}`,
      clientId: client.id,
      merchandise: rng.pick(MERCHANDISE),
      weightKg: rng.int(800, 32000),
      valueCop: Math.round(valueBase),
    });
  }
  return out;
}

function plate(rng: Rng): string {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return `${rng.pick(L.split(""))}${rng.pick(L.split(""))}${rng.pick(L.split(""))} ${rng.int(100, 999)}`;
}

function buildVehicles(rng: Rng, routes: RouteDef[], drivers: Driver[], carriers: Carrier[], orders: Order[]): Vehicle[] {
  const out: Vehicle[] = [];
  for (let i = 0; i < 80; i++) {
    const route = rng.pick(routes);
    const progress = rng.range(0.05, 0.9);
    const { coord, heading } = pointAlong(route.waypoints, progress);
    const speed = route.corridor === "U" ? rng.range(20, 40) : rng.range(45, 80);
    const remainingKm = route.distanceKm * (1 - progress);
    const etaMin = (remainingKm / speed) * 60;
    out.push({
      id: `V${String(i + 1).padStart(3, "0")}`,
      plate: plate(rng),
      driverId: drivers[i % drivers.length].id,
      carrierId: rng.pick(carriers).id,
      routeId: route.id,
      orderId: orders[i % orders.length].id,
      progress,
      speedKmh: speed,
      coord,
      heading,
      status: "en_ruta",
      stoppedSince: null,
      gpsLostSince: null,
      deviationKm: 0,
      altActive: false,
      etaMin,
      slaDeadline: START + (etaMin + rng.range(20, 120)) * MIN,
      incidentId: null,
      departedAt: START - rng.range(30, 300) * MIN,
    });
  }
  return out;
}

// --------------------------------------------------------------------------
export function createInitial(seed = 20260716): SimState {
  uid = 0;
  const rng = makeRng(seed);
  const clients = buildClients(rng);
  const carriers = buildCarriers(rng);
  const drivers = buildDrivers(rng);
  const orders = buildOrders(rng, clients);
  const routes = buildRoutes();
  const vehicles = buildVehicles(rng, routes, drivers, carriers, orders);

  const state: SimState = {
    now: START,
    running: true,
    speed: 45,
    cities: CITIES,
    clients,
    carriers,
    routes,
    drivers,
    orders,
    vehicles,
    incidents: [],
    alerts: [],
    kpis: emptyKpis(),
    selectedIncidentId: null,
    selectedVehicleId: null,
    history: [],
  };

  // Seed a few incidents so the tower opens with an active picture.
  const seedTypes: IncidentType[] = ["bloqueo_vial", "hurto", "clima", "perdida_gps"];
  for (const t of seedTypes) {
    const candidates = vehicles.filter((v) => !v.incidentId);
    const v = rng.pick(candidates);
    spawnIncident(state, v, t, rng, START - rng.range(4, 25) * MIN);
  }
  recomputeAll(state, rng);
  return state;
}

function emptyKpis(): Kpis {
  return {
    slaCompliance: 97,
    costGeneratedCop: 0,
    costAvoidedCop: 0,
    avgReactionMin: 0,
    avgResolutionMin: 0,
    contingencyCompliance: 0,
    activeVehicles: 0,
    openIncidents: 0,
    criticalIncidents: 0,
    otif: 97,
  };
}

// --------------------------------------------------------------------------
function pickSeverity(type: IncidentType, rng: Rng, critical: boolean): Severity {
  const meta = INCIDENT_TYPES[type];
  let sev = rng.weighted(meta.sevWeights.map((s) => ({ v: s.v, w: s.w })));
  if (critical && rng.chance(0.4)) {
    const order: Severity[] = ["baja", "media", "alta", "critica"];
    const idx = Math.min(order.length - 1, order.indexOf(sev) + 1);
    sev = order[idx];
  }
  return sev;
}

function sevMultiplier(sev: Severity): number {
  return { baja: 0.5, media: 1, alta: 1.8, critica: 3 }[sev];
}

function spawnIncident(state: SimState, v: Vehicle, type: IncidentType, rng: Rng, createdAt: number): Incident {
  const meta = INCIDENT_TYPES[type];
  const route = state.routes.find((r) => r.id === v.routeId)!;
  const order = state.orders.find((o) => o.id === v.orderId)!;
  const client = state.clients.find((c) => c.id === order.clientId)!;
  const critical = route.criticalCorridor;
  const severity = pickSeverity(type, rng, critical);

  // Security veto: life-priority incident on a critical southern/robbery corridor.
  const vetoSeguridad =
    meta.lifePriority && (severity === "critica" || (critical && rng.chance(0.5)));
  const finalSev: Severity = vetoSeguridad ? "critica" : severity;

  const nearestCity = [...state.cities].sort(
    (a, b) => haversine(a.coord, v.coord) - haversine(b.coord, v.coord)
  )[0];

  const [lo, hi] = meta.baseCost;
  const estimatedCost = Math.round(rng.range(lo, hi) * sevMultiplier(finalSev) * (0.6 + order.valueCop / 60_000_000));

  const inc: Incident = {
    id: nid("INC"),
    type,
    vehicleId: v.id,
    routeId: v.routeId,
    cityId: nearestCity.id,
    coord: [...v.coord] as [number, number],
    severity: finalSev,
    status: "abierto",
    createdAt,
    detectedAt: createdAt,
    reactedAt: null,
    resolvedAt: null,
    slaDeadline: v.slaDeadline,
    ipi: 0,
    ipiBreakdown: {
      severity: 0,
      slaUrgency: 0,
      typeWeight: 0,
      routeRisk: 0,
      clientPriority: 0,
      value: 0,
      kpiImpact: 0,
    },
    estimatedCostCop: estimatedCost,
    avoidedCostCop: 0,
    affectedKpis: meta.affectedKpis,
    timeline: [
      { id: nid("t"), t: createdAt, label: `Incidente detectado: ${meta.label}`, kind: "system" },
      { id: nid("t"), t: createdAt + 200, label: `Vehículo ${v.plate} · ${route.name}`, kind: "system" },
    ],
    checklist: buildChecklist(),
    comms: [
      {
        id: nid("cm"),
        kind: "comentario",
        from: rng.pick(AGENTS),
        content: `Se abre gestión del incidente. Plan sugerido: ${meta.plan}.`,
        t: createdAt + 300,
      },
    ],
    contingencyPlan: vetoSeguridad ? "VETO DE SEGURIDAD · suspensión inmediata del corredor · H3 aéreo carga crítica" : meta.plan,
    escalated: false,
    vetoSeguridad,
    reroute: false,
    blockCoord: null,
    manual: false,
  };

  // Blockage-type incidents trigger a reroute onto the alternate road (truck keeps moving).
  const canReroute = (type === "bloqueo_vial" || type === "manifestacion" || type === "desvio_ruta") && !!route.altWaypoints;
  if (canReroute) {
    inc.reroute = true;
    inc.blockCoord = [...v.coord] as LatLng;
    v.altActive = true;
    v.status = "en_ruta";
  } else {
    v.status = type === "retraso" ? "en_ruta" : "detenido";
    if (finalSev === "critica" || finalSev === "alta") v.status = "en_incidente";
  }
  v.incidentId = inc.id;
  state.incidents.push(inc);
  return inc;
}

function pushAlert(state: SimState, a: Omit<Alert, "id" | "read">) {
  state.alerts.unshift({ ...a, id: nid("al"), read: false });
  if (state.alerts.length > 60) state.alerts.length = 60;
}

// --------------------------------------------------------------------------
export function advance(prev: SimState, realDtMs: number, rng: Rng): SimState {
  if (!prev.running) return prev;
  const state: SimState = {
    ...prev,
    vehicles: prev.vehicles.map((v) => ({ ...v })),
    incidents: prev.incidents.map((i) => ({ ...i })),
    alerts: [...prev.alerts],
    history: prev.history,
  };
  const dtSim = realDtMs * state.speed;
  const dtMin = dtSim / MIN;
  state.now += dtSim;
  const now = state.now;

  // 1) Move vehicles & detect deviation / stops -----------------------------
  for (const v of state.vehicles) {
    const route = state.routes.find((r) => r.id === v.routeId)!;
    const inc = v.incidentId ? state.incidents.find((i) => i.id === v.incidentId) : null;
    const blocked = inc && inc.status !== "resuelto" && v.status !== "en_ruta";

    // follow the alternate road while rerouting around a blockage
    const path = v.altActive && route.altWaypoints ? route.altWaypoints : route.waypoints;

    if (!blocked) {
      const km = (v.speedKmh * (dtSim / 3_600_000));
      v.progress += km / route.distanceKm;
      v.stoppedSince = null;
      if (v.progress >= 1) {
        // arrived -> recycle onto a fresh route to keep the operation live
        recycleVehicle(state, v, rng);
      } else {
        const p = pointAlong(path, v.progress);
        v.coord = p.coord;
        v.heading = p.heading;
        const remainingKm = route.distanceKm * (1 - v.progress);
        v.etaMin = (remainingKm / v.speedKmh) * 60;
        if (v.status !== "en_incidente") v.status = "en_ruta";
      }
    } else if (v.stoppedSince == null) {
      v.stoppedSince = now;
    }
  }

  // 2) Business rules --------------------------------------------------------
  for (const v of state.vehicles) {
    if (v.incidentId) continue;
    // random GPS dropout
    if (v.gpsLostSince == null && rng.chance(0.002 * dtMin)) {
      v.gpsLostSince = now;
      pushAlert(state, {
        t: now,
        level: "info",
        title: "Señal GPS intermitente",
        detail: `Vehículo ${v.plate} sin reporte de posición.`,
        incidentId: null,
        vehicleId: v.id,
      });
    }
    if (v.gpsLostSince != null) {
      const lostMin = (now - v.gpsLostSince) / MIN;
      if (lostMin > 15) {
        const inc = spawnIncident(state, v, "perdida_gps", rng, now);
        v.gpsLostSince = null;
        pushAlert(state, {
          t: now,
          level: "warn",
          title: "Incidente creado · Pérdida de GPS >15 min",
          detail: `Se genera incidente para ${v.plate}.`,
          incidentId: inc.id,
          vehicleId: v.id,
        });
      } else if (rng.chance(0.25 * dtMin)) {
        v.gpsLostSince = null; // recovered
      }
    }
  }

  // 3) Spawn new incidents (hazard proportional to route risk) --------------
  for (const v of state.vehicles) {
    if (v.incidentId || v.status === "descanso") continue;
    const route = state.routes.find((r) => r.id === v.routeId)!;
    const hazardPerMin = (route.riskLevel / 25) * 0.0022 + 0.0004;
    const p = 1 - Math.exp(-hazardPerMin * dtMin);
    if (rng.chance(p)) {
      const type = pickIncidentType(route, rng);
      const inc = spawnIncident(state, v, type, rng, now);
      const meta = INCIDENT_TYPES[type];
      pushAlert(state, {
        t: now,
        level: inc.severity === "critica" ? "crit" : inc.severity === "alta" ? "crit" : "warn",
        title: `${meta.label} · ${route.name.split("·")[0].trim()}`,
        detail: inc.vetoSeguridad
          ? "⚠ VETO DE SEGURIDAD — suspensión del corredor."
          : `Incidente ${inc.severity.toUpperCase()} en ${v.plate}.`,
        incidentId: inc.id,
        vehicleId: v.id,
      });
    }
  }

  // 4) Progress open incidents: react, auto-checklist, escalate, resolve -----
  for (const inc of state.incidents) {
    if (inc.status === "resuelto") continue;
    const ageMin = (now - inc.createdAt) / MIN;
    const meta = INCIDENT_TYPES[inc.type];

    // Auto-reaction by the tower
    if (inc.reactedAt == null && ageMin >= Math.min(meta.reactionTargetMin, 3)) {
      inc.reactedAt = now;
      inc.status = "en_gestion";
      inc.timeline = [
        ...inc.timeline,
        { id: nid("t"), t: now, label: "Torre de control asume la gestión", kind: "action" },
      ];
    }

    // Reaction SLA breach -> escalate
    if (!inc.escalated && inc.reactedAt == null && ageMin > 15) {
      inc.escalated = true;
      inc.status = "escalado";
      autoCheck(inc, "escalate", now);
      inc.timeline = [
        ...inc.timeline,
        { id: nid("t"), t: now, label: "Escalado: tiempo de reacción > 15 min", kind: "escalation" },
      ];
      pushAlert(state, {
        t: now,
        level: "crit",
        title: "Incidente escalado",
        detail: `Tiempo de reacción superó 15 min.`,
        incidentId: inc.id,
        vehicleId: inc.vehicleId,
      });
    }

    // SLA near expiry -> raise priority / escalate critical
    const slaMin = (inc.slaDeadline - now) / MIN;
    if (slaMin < 30 && !inc.escalated && inc.severity !== "critica") {
      inc.escalated = true;
      inc.status = "escalado";
      inc.timeline = [
        ...inc.timeline,
        { id: nid("t"), t: now, label: "Prioridad incrementada: SLA próximo a vencer", kind: "escalation" },
      ];
    }

    // Auto-progress the contingency checklist as simulated conditions are met
    autoProgressChecklist(inc, ageMin, now, rng, state);

    // Resolution
    const resolveAt = resolutionTargetMin(inc);
    const done = checklistCompletion(inc.checklist);
    if (ageMin >= resolveAt && done >= 70) {
      resolveIncident(state, inc, now, rng);
    }
  }

  recomputeAll(state, rng);

  // sample history for analytics
  const last = state.history[state.history.length - 1];
  if (!last || now - last.t > 3 * MIN) {
    state.history = [...state.history, { t: now, kpis: state.kpis }];
    if (state.history.length > 240) state.history = state.history.slice(-240);
  }

  return state;
}

function pickIncidentType(route: RouteDef, rng: Rng): IncidentType {
  if (route.criticalCorridor) {
    return rng.weighted<IncidentType>([
      { v: "hurto", w: 3 },
      { v: "bloqueo_vial", w: 3 },
      { v: "manifestacion", w: 2 },
      { v: "accidente", w: 2 },
      { v: "desvio_ruta", w: 2 },
      { v: "parada_no_autorizada", w: 1 },
      { v: "clima", w: 1 },
      { v: "retraso", w: 1 },
      { v: "falla_mecanica", w: 1 },
      { v: "perdida_gps", w: 1 },
    ]);
  }
  return rng.weighted<IncidentType>([
    { v: "retraso", w: 3 },
    { v: "falla_mecanica", w: 3 },
    { v: "clima", w: 2 },
    { v: "parada_no_autorizada", w: 2 },
    { v: "desvio_ruta", w: 1 },
    { v: "accidente", w: 1 },
    { v: "perdida_gps", w: 1 },
    { v: "bloqueo_vial", w: 1 },
  ]);
}

function autoCheck(inc: Incident, id: string, now: number, by = "Automático") {
  const item = inc.checklist.find((c) => c.id === id);
  if (item && !item.done) {
    item.done = true;
    item.doneAt = now;
    item.by = by;
  }
}

function autoProgressChecklist(inc: Incident, ageMin: number, now: number, rng: Rng, state: SimState) {
  const steps: { id: string; at: number; comm?: { kind: any; text: string } }[] = [
    { id: "contact_driver", at: 1, comm: { kind: "llamada", text: "Llamada al conductor: confirma estado y seguridad." } },
    { id: "confirm_location", at: 3, comm: { kind: "comentario", text: "Ubicación confirmada por GPS/geocerca." } },
    { id: "contact_carrier", at: 5, comm: { kind: "llamada", text: "Transportadora notificada, activando protocolo." } },
    { id: "inform_client", at: 8, comm: { kind: "correo", text: "Cliente informado del evento y plan de acción." } },
  ];
  for (const s of steps) {
    const item = inc.checklist.find((c) => c.id === s.id)!;
    if (!item.done && ageMin >= s.at) {
      autoCheck(inc, s.id, now, rng.pick(AGENTS));
      inc.timeline = [...inc.timeline, { id: nid("t"), t: now, label: `✓ ${item.label}`, kind: "action" }];
      if (s.comm) {
        inc.comms = [
          ...inc.comms,
          { id: nid("cm"), kind: s.comm.kind, from: item.by || AGENTS[0], content: s.comm.text, t: now },
        ];
      }
    }
  }
  // evidence around mid-life
  if (ageMin >= 10) {
    const ev = inc.checklist.find((c) => c.id === "register_evidence")!;
    if (!ev.done) {
      autoCheck(inc, "register_evidence", now, rng.pick(AGENTS));
      inc.comms = [
        ...inc.comms,
        { id: nid("cm"), kind: "foto", from: ev.by || AGENTS[0], content: "Evidencia fotográfica adjunta (IMG_" + rng.int(1000, 9999) + ".jpg).", t: now },
      ];
      inc.timeline = [...inc.timeline, { id: nid("t"), t: now, label: "✓ Registrar evidencia", kind: "action" }];
    }
  }
}

function resolutionTargetMin(inc: Incident): number {
  const base = { baja: 12, media: 25, alta: 45, critica: 75 }[inc.severity];
  return base;
}

function resolveIncident(state: SimState, inc: Incident, now: number, rng: Rng) {
  autoCheck(inc, "escalate", now);
  autoCheck(inc, "close_incident", now, rng.pick(AGENTS));
  inc.status = "resuelto";
  inc.resolvedAt = now;
  // Avoided cost: what a mishandled incident would have cost minus what happened.
  inc.avoidedCostCop = Math.round(inc.estimatedCostCop * rng.range(0.8, 1.8));
  inc.timeline = [
    ...inc.timeline,
    { id: nid("t"), t: now, label: "Incidente resuelto y cerrado", kind: "action" },
  ];
  inc.comms = [
    ...inc.comms,
    { id: nid("cm"), kind: "comentario", from: rng.pick(AGENTS), content: "Incidente cerrado. Operación normalizada.", t: now },
  ];
  const v = state.vehicles.find((x) => x.id === inc.vehicleId);
  if (v) {
    v.incidentId = null;
    v.status = "en_ruta";
    v.deviationKm = 0;
    v.altActive = false;
  }
  pushAlert(state, {
    t: now,
    level: "info",
    title: "Incidente resuelto",
    detail: `${INCIDENT_TYPES[inc.type].label} cerrado. Costo evitado ~ estimado.`,
    incidentId: inc.id,
    vehicleId: inc.vehicleId,
  });
}

function recycleVehicle(state: SimState, v: Vehicle, rng: Rng) {
  const route = rng.pick(state.routes);
  v.routeId = route.id;
  v.progress = 0;
  const p = pointAlong(route.waypoints, 0);
  v.coord = p.coord;
  v.heading = p.heading;
  v.speedKmh = route.corridor === "U" ? rng.range(20, 40) : rng.range(45, 80);
  v.orderId = rng.pick(state.orders).id;
  v.status = "en_ruta";
  v.etaMin = (route.distanceKm / v.speedKmh) * 60;
  v.slaDeadline = state.now + (v.etaMin + rng.range(20, 120)) * MIN;
  v.departedAt = state.now;
  v.deviationKm = 0;
  v.altActive = false;
}

// --------------------------------------------------------------------------
function recomputeAll(state: SimState, rng: Rng) {
  const now = state.now;
  // IPI per open incident
  for (const inc of state.incidents) {
    if (inc.status === "resuelto") continue;
    const route = state.routes.find((r) => r.id === inc.routeId)!;
    const v = state.vehicles.find((x) => x.id === inc.vehicleId);
    const order = v ? state.orders.find((o) => o.id === v.orderId) : null;
    const client = order ? state.clients.find((c) => c.id === order.clientId) : null;
    const { ipi, breakdown } = computeIpi({
      severity: inc.severity,
      minutesToSla: (inc.slaDeadline - now) / MIN,
      typeWeight: INCIDENT_TYPES[inc.type].typeWeight,
      routeRisk: route.riskLevel,
      clientPriority: client?.priorityScore ?? 40,
      valueCop: order?.valueCop ?? 5_000_000,
      affectedKpiCount: inc.affectedKpis.length,
      vetoSeguridad: inc.vetoSeguridad,
    });
    inc.ipi = ipi;
    inc.ipiBreakdown = breakdown;
  }

  // KPIs
  const open = state.incidents.filter((i) => i.status !== "resuelto");
  const resolved = state.incidents.filter((i) => i.status === "resuelto");
  const active = state.vehicles.filter((v) => v.status !== "finalizado");

  const reactAll = state.incidents.filter((i) => i.reactedAt != null);
  const avgReaction = reactAll.length
    ? reactAll.reduce((s, i) => s + (i.reactedAt! - i.detectedAt) / MIN, 0) / reactAll.length
    : 0;
  const avgResolution = resolved.length
    ? resolved.reduce((s, i) => s + (i.resolvedAt! - i.createdAt) / MIN, 0) / resolved.length
    : 0;

  const allWithChecklist = state.incidents;
  const contingency = allWithChecklist.length
    ? allWithChecklist.reduce((s, i) => s + checklistCompletion(i.checklist), 0) / allWithChecklist.length
    : 100;

  const costGenerated = state.incidents.reduce((s, i) => s + i.estimatedCostCop, 0);
  const costAvoided = resolved.reduce((s, i) => s + i.avoidedCostCop, 0);

  // SLA compliance: vehicles whose deadline is still ahead, penalized by open criticals
  const onTime = active.filter((v) => v.slaDeadline > now).length;
  const criticals = open.filter((i) => i.severity === "critica" || i.ipi >= 80).length;
  let sla = active.length ? (onTime / active.length) * 100 : 100;
  sla = Math.max(70, Math.min(99.5, sla - criticals * 1.4 - open.length * 0.3));
  const otif = Math.max(65, sla - 1.5 - open.length * 0.2);

  state.kpis = {
    slaCompliance: Number(sla.toFixed(1)),
    costGeneratedCop: costGenerated,
    costAvoidedCop: costAvoided,
    avgReactionMin: Number(avgReaction.toFixed(1)),
    avgResolutionMin: Number(avgResolution.toFixed(1)),
    contingencyCompliance: Number(contingency.toFixed(1)),
    activeVehicles: active.length,
    openIncidents: open.length,
    criticalIncidents: criticals,
    otif: Number(otif.toFixed(1)),
  };

  // keep incidents sorted by IPI desc (open first)
  state.incidents.sort((a, b) => {
    if ((a.status === "resuelto") !== (b.status === "resuelto")) return a.status === "resuelto" ? 1 : -1;
    return b.ipi - a.ipi;
  });
}

// Manual actions from the UI ------------------------------------------------
export function toggleChecklistItem(state: SimState, incidentId: string, itemId: string): SimState {
  const incidents = state.incidents.map((i) => {
    if (i.id !== incidentId) return i;
    const checklist = i.checklist.map((c) =>
      c.id === itemId
        ? { ...c, done: !c.done, doneAt: !c.done ? state.now : null, by: !c.done ? "Operador (manual)" : null }
        : c
    );
    const timeline = [
      ...i.timeline,
      {
        id: nid("t"),
        t: state.now,
        label: `${i.checklist.find((c) => c.id === itemId)?.done ? "Desmarcado" : "✓"} ${i.checklist.find((c) => c.id === itemId)?.label}`,
        kind: "action" as const,
      },
    ];
    return { ...i, checklist, timeline };
  });
  return { ...state, incidents };
}

export function addComment(state: SimState, incidentId: string, text: string): SimState {
  const incidents = state.incidents.map((i) =>
    i.id === incidentId
      ? {
          ...i,
          comms: [
            ...i.comms,
            { id: nid("cm"), kind: "comentario" as const, from: "Operador (manual)", content: text, t: state.now },
          ],
        }
      : i
  );
  return { ...state, incidents };
}

// Manual operator report: creates an incident on a chosen corridor/tramo and
// connects it to the live map by placing a vehicle at that segment.
export function manualReport(
  prev: SimState,
  routeId: string,
  tramoIdx: number,
  type: IncidentType,
  rng: Rng
): { state: SimState; incidentId: string | null } {
  const state: SimState = {
    ...prev,
    vehicles: prev.vehicles.map((v) => ({ ...v })),
    incidents: prev.incidents.map((i) => ({ ...i })),
    alerts: [...prev.alerts],
  };
  const route = state.routes.find((r) => r.id === routeId);
  if (!route) return { state: prev, incidentId: null };
  const tramo = route.tramos[tramoIdx];
  if (!tramo) return { state: prev, incidentId: null };

  // prefer a free vehicle already on this route; else the nearest free one
  let v = state.vehicles.find((x) => x.routeId === routeId && !x.incidentId);
  if (!v) {
    const free = state.vehicles.filter((x) => !x.incidentId);
    v = [...free].sort(
      (a, b) => haversine(a.coord, tramo.mid) - haversine(b.coord, tramo.mid)
    )[0];
  }
  if (!v) v = state.vehicles[0];
  if (v.incidentId) {
    const old = state.incidents.find((i) => i.id === v!.incidentId);
    if (old) old.status = "resuelto";
    v.incidentId = null;
  }
  // place the vehicle on the reported tramo
  v.routeId = routeId;
  v.progress = tramo.frac;
  const p = pointAlong(route.waypoints, tramo.frac);
  v.coord = p.coord;
  v.heading = p.heading;
  v.altActive = false;

  const inc = spawnIncident(state, v, type, rng, state.now);
  inc.manual = true;
  inc.timeline = [
    ...inc.timeline,
    { id: nid("t"), t: state.now, label: `Reporte manual del operador · tramo ${tramo.name} (${tramo.crit})`, kind: "action" },
  ];
  inc.comms = [
    ...inc.comms,
    { id: nid("cm"), kind: "comentario", from: "Operador de monitoreo", content: `Reporte manual desde tracking: ${INCIDENT_TYPES[type].label} en ${tramo.name}.`, t: state.now },
  ];
  pushAlert(state, {
    t: state.now,
    level: inc.severity === "critica" || inc.severity === "alta" ? "crit" : "warn",
    title: `Reporte manual · ${INCIDENT_TYPES[type].label}`,
    detail: `${tramo.name} (${tramo.crit}) · ${v.plate}`,
    incidentId: inc.id,
    vehicleId: v.id,
  });
  recomputeAll(state, rng);
  return { state, incidentId: inc.id };
}
