"use client";

import {
  AlertOctagon,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DollarSign,
  ShieldCheck,
  Timer,
  Truck,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSimulation } from "@/store/useSimulation";
import { copShort, fmtMin, pct } from "@/lib/format";
import { Progress } from "@/components/ui/primitives";
import clsx from "clsx";

function Kpi({
  label,
  value,
  sub,
  icon,
  tone = "brand",
  progress,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: ReactNode;
  tone?: "brand" | "ok" | "warn" | "crit" | "info" | "purple";
  progress?: number;
}) {
  const toneMap = {
    brand: "text-brand",
    ok: "text-ok",
    warn: "text-warn",
    crit: "text-crit",
    info: "text-info",
    purple: "text-purple",
  }[tone];
  const barColor = { brand: "#22d3ee", ok: "#22c55e", warn: "#f59e0b", crit: "#ef4444", info: "#3b82f6", purple: "#a855f7" }[tone];
  return (
    <div className="card flex min-w-[150px] flex-1 flex-col gap-1.5 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
        <span className={toneMap}>{icon}</span>
      </div>
      <div className="text-xl font-semibold tabular-nums text-slate-100">{value}</div>
      {progress != null ? (
        <Progress value={progress} color={barColor} />
      ) : (
        sub && <div className="text-[11px] text-slate-500">{sub}</div>
      )}
    </div>
  );
}

export function KpiBar() {
  const k = useSimulation((s) => s.kpis);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <Kpi
        label="Cumplimiento SLA"
        value={pct(k.slaCompliance)}
        icon={<ShieldCheck size={15} />}
        tone={k.slaCompliance >= 95 ? "ok" : k.slaCompliance >= 90 ? "warn" : "crit"}
        progress={k.slaCompliance}
      />
      <Kpi
        label="Cumplim. Plan Contingencia"
        value={pct(k.contingencyCompliance)}
        icon={<ClipboardCheck size={15} />}
        tone="brand"
        progress={k.contingencyCompliance}
      />
      <Kpi label="Costo generado" value={copShort(k.costGeneratedCop)} icon={<DollarSign size={15} />} tone="crit" sub="Impacto acumulado" />
      <Kpi label="Costo evitado" value={copShort(k.costAvoidedCop)} icon={<Zap size={15} />} tone="ok" sub="Por gestión de contingencia" />
      <Kpi label="OTIF" value={pct(k.otif)} icon={<CheckCircle2 size={15} />} tone={k.otif >= 93 ? "ok" : "warn"} progress={k.otif} />
      <Kpi label="T. prom. reacción" value={fmtMin(k.avgReactionMin)} icon={<Timer size={15} />} tone={k.avgReactionMin <= 15 ? "ok" : "warn"} sub="Objetivo ≤ 15 min" />
      <Kpi label="T. prom. resolución" value={fmtMin(k.avgResolutionMin)} icon={<Clock size={15} />} tone="info" sub="Cierre de incidentes" />
      <Kpi label="Vehículos activos" value={k.activeVehicles} icon={<Truck size={15} />} tone="brand" sub="En operación" />
      <Kpi label="Incidentes abiertos" value={k.openIncidents} icon={<AlertOctagon size={15} />} tone={k.openIncidents > 4 ? "warn" : "info"} sub="En gestión / escalados" />
      <Kpi
        label="Incidentes críticos"
        value={<span className={clsx(k.criticalIncidents > 0 && "text-crit")}>{k.criticalIncidents}</span>}
        icon={<AlertOctagon size={15} />}
        tone="crit"
        sub={k.criticalIncidents > 0 ? "Atención inmediata" : "Sin críticos"}
      />
    </div>
  );
}
