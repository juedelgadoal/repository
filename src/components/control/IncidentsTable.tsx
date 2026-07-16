"use client";

import { useSimulation } from "@/store/useSimulation";
import { INCIDENT_TYPES } from "@/lib/domain";
import { SEVERITY_UI, STATUS_UI } from "@/lib/ui";
import { ipiBand } from "@/lib/ipi";
import { copShort, fmtDuration } from "@/lib/format";
import { Badge, Dot } from "@/components/ui/primitives";
import { AlertTriangle, ChevronRight } from "lucide-react";
import clsx from "clsx";

export function IncidentsTable({ compact = false }: { compact?: boolean }) {
  const incidents = useSimulation((s) => s.incidents);
  const vehicles = useSimulation((s) => s.vehicles);
  const routes = useSimulation((s) => s.routes);
  const cities = useSimulation((s) => s.cities);
  const now = useSimulation((s) => s.now);
  const selectIncident = useSimulation((s) => s.selectIncident);
  const selectedIncidentId = useSimulation((s) => s.selectedIncidentId);

  const rows = incidents.filter((i) => i.status !== "resuelto").slice(0, compact ? 6 : 100);

  return (
    <div className="min-h-0 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-base-800/95 text-left text-[10px] uppercase tracking-wider text-slate-500 backdrop-blur">
          <tr className="border-b border-line">
            <th className="px-3 py-2 font-medium">IPI</th>
            <th className="px-3 py-2 font-medium">Incidente</th>
            <th className="px-3 py-2 font-medium">Vehículo</th>
            {!compact && <th className="px-3 py-2 font-medium">Ruta</th>}
            <th className="px-3 py-2 font-medium">Sev.</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Transcurrido</th>
            <th className="px-3 py-2 font-medium">SLA restante</th>
            {!compact && <th className="px-3 py-2 font-medium">Costo est.</th>}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={compact ? 8 : 10} className="px-3 py-8 text-center text-xs text-slate-500">
                No hay incidentes abiertos. La operación está estable.
              </td>
            </tr>
          )}
          {rows.map((inc) => {
            const v = vehicles.find((x) => x.id === inc.vehicleId);
            const route = routes.find((r) => r.id === inc.routeId);
            const meta = INCIDENT_TYPES[inc.type];
            const band = ipiBand(inc.ipi);
            const elapsed = now - inc.createdAt;
            const slaLeft = inc.slaDeadline - now;
            const slaCrit = slaLeft < 30 * 60_000;
            const sev = SEVERITY_UI[inc.severity];
            const st = STATUS_UI[inc.status];
            return (
              <tr
                key={inc.id}
                onClick={() => selectIncident(inc.id)}
                className={clsx(
                  "cursor-pointer border-b border-line/60 transition-colors hover:bg-base-600/40",
                  selectedIncidentId === inc.id && "bg-brand/5"
                )}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-9 items-center justify-center rounded-md font-mono text-sm font-bold"
                      style={{ background: band.color + "22", color: band.color }}
                    >
                      {inc.ipi}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {inc.vetoSeguridad && <AlertTriangle size={13} className="shrink-0 text-crit animate-blink" />}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-200">{meta.label}</div>
                      <div className="truncate text-[11px] text-slate-500">{cities.find((c) => c.id === inc.cityId)?.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-mono text-xs text-slate-300">{v?.plate}</div>
                </td>
                {!compact && (
                  <td className="px-3 py-2.5">
                    <div className="max-w-[180px] truncate text-xs text-slate-400">{route?.name.split("·")[1]?.trim() ?? route?.name}</div>
                  </td>
                )}
                <td className="px-3 py-2.5">
                  <Badge color={sev.color}>{sev.label}</Badge>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <Dot color={st.color} pulse={inc.status === "escalado"} />
                    <span className="text-xs text-slate-300">{st.label}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-300 tabular-nums">{fmtDuration(elapsed)}</td>
                <td className="px-3 py-2.5">
                  <span className={clsx("font-mono text-xs tabular-nums", slaCrit ? "text-crit animate-blink" : "text-slate-300")}>
                    {slaLeft <= 0 ? "VENCIDO" : fmtDuration(slaLeft)}
                  </span>
                </td>
                {!compact && <td className="px-3 py-2.5 text-xs text-slate-400">{copShort(inc.estimatedCostCop)}</td>}
                <td className="px-3 py-2.5 text-right">
                  <ChevronRight size={15} className="text-slate-600" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
