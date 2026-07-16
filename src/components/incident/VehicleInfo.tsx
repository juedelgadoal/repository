"use client";

import { Truck } from "lucide-react";
import type { ReactNode } from "react";
import { useSimulation } from "@/store/useSimulation";
import { cityById } from "@/lib/domain";
import { VEHICLE_STATUS_UI } from "@/lib/ui";
import { copFull, fmtDuration, fmtMin } from "@/lib/format";
import { Badge, Dot, Progress, SectionTitle } from "@/components/ui/primitives";
import clsx from "clsx";

function Info({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={clsx("text-sm text-slate-200", mono && "font-mono")}>{value}</div>
    </div>
  );
}

export function VehicleInfo({ vehicleId }: { vehicleId: string }) {
  const v = useSimulation((s) => s.vehicles.find((x) => x.id === vehicleId));
  const routes = useSimulation((s) => s.routes);
  const clients = useSimulation((s) => s.clients);
  const carriers = useSimulation((s) => s.carriers);
  const drivers = useSimulation((s) => s.drivers);
  const orders = useSimulation((s) => s.orders);
  const now = useSimulation((s) => s.now);

  if (!v) return <div className="p-6 text-sm text-slate-500">Vehículo no encontrado.</div>;

  const route = routes.find((r) => r.id === v.routeId);
  const order = orders.find((o) => o.id === v.orderId);
  const client = order ? clients.find((c) => c.id === order.clientId) : null;
  const carrier = carriers.find((c) => c.id === v.carrierId);
  const driver = drivers.find((d) => d.id === v.driverId);
  const st = VEHICLE_STATUS_UI[v.status];
  const slaLeft = v.slaDeadline - now;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <Truck size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-lg font-semibold text-slate-100">{v.plate}</h2>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Dot color={st.color} pulse={v.status !== "en_ruta"} /> {st.label}
            </span>
          </div>
          <div className="text-xs text-slate-500">{v.id} · {carrier?.name}</div>
        </div>
      </div>

      <div className="panel p-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">Progreso de ruta</span>
          <span className="font-mono text-slate-300">{(v.progress * 100).toFixed(0)}%</span>
        </div>
        <Progress value={v.progress * 100} />
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>{route ? cityById(route.originCityId).name : ""}</span>
          <span>ETA {fmtMin(v.etaMin)}</span>
          <span>{route ? cityById(route.destCityId).name : ""}</span>
        </div>
      </div>

      <div className="panel p-3">
        <SectionTitle>Información de la operación</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Info label="Conductor" value={driver?.name} />
          <Info label="Teléfono" value={driver?.phone} mono />
          <Info label="Cliente" value={client?.name} />
          <Info label="Línea" value={<Badge color="#22d3ee">{client?.line}</Badge>} />
          <Info label="Transportadora" value={carrier?.name} />
          <Info label="Guía" value={order?.id} mono />
          <Info label="Mercancía" value={order?.merchandise} />
          <Info label="Peso" value={`${order?.weightKg.toLocaleString("es-CO")} kg`} />
          <Info label="Valor" value={order ? copFull(order.valueCop) : "—"} />
          <Info label="Velocidad" value={`${Math.round(v.speedKmh)} km/h`} />
          <Info label="Ruta" value={route?.name} />
          <Info label="Riesgo ruta" value={<Badge color={route && route.criticalCorridor ? "#ef4444" : "#22c55e"}>{route?.riskLabel}</Badge>} />
          <Info label="SLA restante" value={<span className={slaLeft < 30 * 60_000 ? "text-crit" : ""}>{slaLeft <= 0 ? "VENCIDO" : fmtDuration(slaLeft)}</span>} />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-base-700/40 p-3 text-xs text-slate-500">
        Este vehículo no tiene incidentes activos. Monitoreo en tiempo real desde la torre de control.
      </div>
    </div>
  );
}
