"use client";

import { AlertOctagon, CheckCircle2, Flame, ShieldAlert } from "lucide-react";
import { useSimulation } from "@/store/useSimulation";
import { IncidentsTable } from "@/components/control/IncidentsTable";
import { INCIDENT_TYPES } from "@/lib/domain";
import { ipiBand } from "@/lib/ipi";
import { copShort, fmtDuration } from "@/lib/format";
import { Badge, SectionTitle } from "@/components/ui/primitives";

function Stat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: color + "1f", color }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold tabular-nums text-slate-100">{value}</div>
        <div className="text-[11px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function IncidentesPage() {
  const incidents = useSimulation((s) => s.incidents);
  const now = useSimulation((s) => s.now);
  const selectIncident = useSimulation((s) => s.selectIncident);

  const open = incidents.filter((i) => i.status !== "resuelto");
  const escalated = open.filter((i) => i.status === "escalado");
  const critical = open.filter((i) => i.severity === "critica" || i.ipi >= 80);
  const resolved = incidents.filter((i) => i.status === "resuelto");
  const topPriority = open[0];

  return (
    <div className="space-y-3 p-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Incidentes abiertos" value={open.length} icon={<AlertOctagon size={20} />} color="#3b82f6" />
        <Stat label="Escalados" value={escalated.length} icon={<ShieldAlert size={20} />} color="#f59e0b" />
        <Stat label="Críticos" value={critical.length} icon={<Flame size={20} />} color="#ef4444" />
        <Stat label="Resueltos (sesión)" value={resolved.length} icon={<CheckCircle2 size={20} />} color="#22c55e" />
      </div>

      {topPriority && (
        <div
          className="panel cursor-pointer p-4 transition-colors hover:bg-base-700/60"
          onClick={() => selectIncident(topPriority.id)}
          style={{ boxShadow: `inset 3px 0 0 0 ${ipiBand(topPriority.ipi).color}` }}
        >
          <SectionTitle right={<Badge color={ipiBand(topPriority.ipi).color}>IPI {topPriority.ipi} · {ipiBand(topPriority.ipi).label}</Badge>}>
            Máxima prioridad ahora · acción recomendada
          </SectionTitle>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-100">{INCIDENT_TYPES[topPriority.type].label}</div>
              <div className="text-sm text-slate-400">{topPriority.contingencyPlan}</div>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-[10px] uppercase text-slate-500">Transcurrido</div>
                <div className="font-mono text-slate-200">{fmtDuration(now - topPriority.createdAt)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Costo estimado</div>
                <div className="text-crit">{copShort(topPriority.estimatedCostCop)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="panel flex flex-col">
        <div className="border-b border-line px-3 py-2.5">
          <SectionTitle>Cola priorizada por IPI · clic para gestionar</SectionTitle>
        </div>
        <IncidentsTable />
      </div>

      {resolved.length > 0 && (
        <div className="panel flex flex-col">
          <div className="border-b border-line px-3 py-2.5">
            <SectionTitle>Incidentes resueltos</SectionTitle>
          </div>
          <div className="max-h-72 overflow-auto p-2">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {resolved.slice(0, 20).map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => selectIncident(inc.id)}
                  className="flex items-center justify-between rounded-lg border border-line bg-base-700/40 p-2.5 text-left hover:bg-base-600/50"
                >
                  <div>
                    <div className="text-sm text-slate-300">{INCIDENT_TYPES[inc.type].label}</div>
                    <div className="text-[11px] text-slate-500">
                      Resuelto en {inc.resolvedAt ? fmtDuration(inc.resolvedAt - inc.createdAt) : "—"}
                    </div>
                  </div>
                  <Badge color="#22c55e">+{copShort(inc.avoidedCostCop)}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
