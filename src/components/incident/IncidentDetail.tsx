"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  History,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSimulation } from "@/store/useSimulation";
import { INCIDENT_TYPES, cityById } from "@/lib/domain";
import { SEVERITY_UI, STATUS_UI } from "@/lib/ui";
import { copFull, copShort, fmtDuration } from "@/lib/format";
import { Badge, Dot, SectionTitle } from "@/components/ui/primitives";
import { IpiBreakdown } from "./IpiBreakdown";
import { Checklist } from "./Checklist";
import { Timeline } from "./Timeline";
import { CommsLog } from "./CommsLog";
import clsx from "clsx";

function Info({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={clsx("text-sm text-slate-200", mono && "font-mono")}>{value}</div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: ReactNode; tone: string }) {
  return (
    <div className="rounded-lg border border-line bg-base-700/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

export function IncidentDetail({ incidentId }: { incidentId: string }) {
  const inc = useSimulation((s) => s.incidents.find((i) => i.id === incidentId));
  const vehicles = useSimulation((s) => s.vehicles);
  const routes = useSimulation((s) => s.routes);
  const clients = useSimulation((s) => s.clients);
  const carriers = useSimulation((s) => s.carriers);
  const drivers = useSimulation((s) => s.drivers);
  const orders = useSimulation((s) => s.orders);
  const now = useSimulation((s) => s.now);
  const [tab, setTab] = useState<"timeline" | "comms">("timeline");

  if (!inc) return <div className="p-6 text-sm text-slate-500">Incidente no encontrado.</div>;

  const v = vehicles.find((x) => x.id === inc.vehicleId);
  const route = routes.find((r) => r.id === inc.routeId);
  const order = v ? orders.find((o) => o.id === v.orderId) : null;
  const client = order ? clients.find((c) => c.id === order.clientId) : null;
  const carrier = v ? carriers.find((c) => c.id === v.carrierId) : null;
  const driver = v ? drivers.find((d) => d.id === v.driverId) : null;
  const meta = INCIDENT_TYPES[inc.type];
  const sev = SEVERITY_UI[inc.severity];
  const st = STATUS_UI[inc.status];
  const elapsed = now - inc.createdAt;
  const slaLeft = inc.slaDeadline - now;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: meta.color + "22", color: meta.color }}
          >
            <ShieldAlert size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-100">{meta.label}</h2>
              <span className="font-mono text-xs text-slate-500">{inc.id}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge color={sev.color} glow={inc.severity === "critica"}>
                Severidad {sev.label}
              </Badge>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Dot color={st.color} pulse={inc.status === "escalado"} /> {st.label}
              </span>
            </div>
          </div>
        </div>

        {inc.vetoSeguridad && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-crit/40 bg-crit/10 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-crit animate-blink" />
            <div className="text-xs text-crit">
              <span className="font-semibold">VETO DE SEGURIDAD ·</span> Prioridad vida. Suspensión inmediata del
              corredor y protección del conductor. La seguridad del conductor domina sobre H1/H2/H3.
            </div>
          </div>
        )}

        <div className="mt-3 rounded-lg border border-brand/25 bg-brand/5 p-3">
          <div className="text-[10px] uppercase tracking-wide text-brand">Plan de contingencia recomendado</div>
          <div className="mt-0.5 text-sm text-slate-200">{inc.contingencyPlan}</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="Tiempo transcurrido" value={fmtDuration(elapsed)} tone="#e2e8f0" />
        <Metric
          label="SLA restante"
          value={slaLeft <= 0 ? "VENCIDO" : fmtDuration(slaLeft)}
          tone={slaLeft < 30 * 60_000 ? "#ef4444" : "#22c55e"}
        />
        <Metric label="Costo estimado" value={copShort(inc.estimatedCostCop)} tone="#ef4444" />
        <Metric label="Costo evitado" value={inc.avoidedCostCop ? copShort(inc.avoidedCostCop) : "—"} tone="#22c55e" />
      </div>

      {/* Vehicle & operation info */}
      <div className="panel p-3">
        <SectionTitle>Información del vehículo y operación</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
          <Info label="Placa" value={v?.plate} mono />
          <Info label="Conductor" value={driver?.name} />
          <Info label="Teléfono conductor" value={driver?.phone} mono />
          <Info label="Cliente" value={client?.name} />
          <Info label="Línea de negocio" value={<Badge color="#22d3ee">{client?.line}</Badge>} />
          <Info label="Transportadora" value={carrier?.name} />
          <Info label="Número de guía" value={order?.id} mono />
          <Info label="Tipo de mercancía" value={order?.merchandise} />
          <Info label="Peso" value={`${order?.weightKg.toLocaleString("es-CO")} kg`} />
          <Info label="Valor mercancía" value={order ? copFull(order.valueCop) : "—"} />
          <Info label="Ciudad" value={cityById(inc.cityId).name} />
          <Info label="Regional" value={cityById(inc.cityId).regional} />
          <Info label="Ruta" value={route?.name} />
          <Info label="Origen" value={route ? cityById(route.originCityId).name : "—"} />
          <Info label="Destino" value={route ? cityById(route.destCityId).name : "—"} />
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">KPIs afectados</div>
          <div className="flex flex-wrap gap-1.5">
            {inc.affectedKpis.map((k) => (
              <Badge key={k} color="#f59e0b">
                {k}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* IPI + Checklist */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel p-3">
          <SectionTitle>Índice de Prioridad del Incidente (IPI)</SectionTitle>
          <IpiBreakdown inc={inc} />
        </div>
        <div className="panel p-3">
          <SectionTitle
            right={
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <ClipboardList size={12} /> auto-marcado por reglas
              </span>
            }
          >
            Checklist plan de contingencia
          </SectionTitle>
          <Checklist inc={inc} />
        </div>
      </div>

      {/* Timeline / Comms */}
      <div className="panel p-3">
        <div className="mb-3 flex items-center gap-1 border-b border-line pb-2">
          <button
            onClick={() => setTab("timeline")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === "timeline" ? "bg-brand/15 text-brand" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <History size={13} /> Línea de tiempo · Historial
          </button>
          <button
            onClick={() => setTab("comms")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === "comms" ? "bg-brand/15 text-brand" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <MessageSquare size={13} /> Bitácora de comunicaciones
          </button>
        </div>
        {tab === "timeline" ? <Timeline inc={inc} /> : <CommsLog inc={inc} />}
      </div>
    </div>
  );
}
