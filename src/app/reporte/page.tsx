"use client";

import { useMemo } from "react";
import { Download, FileText, Lightbulb, ListChecks } from "lucide-react";
import { useSimulation } from "@/store/useSimulation";
import { buildReport } from "@/lib/report";
import { generateReportPdf } from "@/lib/pdf";
import type { SimState } from "@/lib/types";
import { copShort, fmtClock, fmtMin, pct } from "@/lib/format";
import { SectionTitle, Badge } from "@/components/ui/primitives";

export default function ReportePage() {
  const state = useSimulation((s) => s) as unknown as SimState;
  const now = useSimulation((s) => s.now);
  const r = useMemo(() => buildReport(state), [now]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpiRows: [string, string][] = [
    ["Cumplimiento SLA", pct(r.kpis.slaCompliance)],
    ["OTIF", pct(r.kpis.otif)],
    ["Cumplimiento Plan Contingencia", pct(r.kpis.contingencyCompliance)],
    ["Costo generado", copShort(r.kpis.costGeneratedCop)],
    ["Costo evitado", copShort(r.kpis.costAvoidedCop)],
    ["T. prom. reacción", fmtMin(r.kpis.avgReactionMin)],
    ["T. prom. resolución", fmtMin(r.kpis.avgResolutionMin)],
    ["Vehículos activos", String(r.kpis.activeVehicles)],
    ["Incidentes abiertos", String(r.kpis.openIncidents)],
    ["Incidentes críticos", String(r.kpis.criticalIncidents)],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-3">
      {/* Header / actions */}
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/15 text-brand shadow-glow">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Reporte Ejecutivo</h1>
            <p className="text-xs text-slate-500">
              Generado automáticamente · corte {fmtClock(r.generatedAt)} · datos simulados
            </p>
          </div>
        </div>
        <button onClick={() => generateReportPdf(r)} className="btn-primary">
          <Download size={16} /> Descargar PDF
        </button>
      </div>

      {/* 1. KPIs */}
      <div className="panel p-4">
        <SectionTitle>1. Resumen de la operación · KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {kpiRows.map(([l, v]) => (
            <div key={l} className="flex items-center justify-between rounded-lg border border-line bg-base-700/40 px-3 py-2">
              <span className="text-xs text-slate-400">{l}</span>
              <span className="font-semibold tabular-nums text-slate-100">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Incidents + 3. costs */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="panel p-4">
          <SectionTitle>2. Incidentes</SectionTitle>
          <div className="mb-2 text-sm text-slate-300">
            Total: <b>{r.a.total}</b> · Resueltos: <b>{r.a.resolvedCount}</b>
          </div>
          <div className="space-y-1.5">
            {[...r.a.byType].sort((a, b) => b.value - a.value).map((t) => (
              <div key={t.name} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{t.name}</span>
                <span className="font-mono text-slate-300">{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <SectionTitle>3. Costos</SectionTitle>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500">Costo generado por incidentes</div>
              <div className="text-2xl font-semibold text-crit">{copShort(r.kpis.costGeneratedCop)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Costo evitado por contingencia</div>
              <div className="text-2xl font-semibold text-ok">{copShort(r.kpis.costAvoidedCop)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Clients + 5. SLA */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="panel p-4">
          <SectionTitle>4. Clientes afectados</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {r.clientList.length === 0 && <span className="text-xs text-slate-500">Sin clientes afectados.</span>}
            {r.clientList.map((c) => (
              <Badge key={c.id} color={c.critical ? "#ef4444" : "#22d3ee"}>
                {c.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="panel p-4">
          <SectionTitle>5. Cumplimiento SLA y Plan de Contingencia</SectionTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { l: "SLA", v: pct(r.kpis.slaCompliance) },
              { l: "OTIF", v: pct(r.kpis.otif) },
              { l: "Plan", v: pct(r.kpis.contingencyCompliance) },
            ].map((x) => (
              <div key={x.l} className="rounded-lg border border-line bg-base-700/40 py-3">
                <div className="text-xl font-semibold text-brand">{x.v}</div>
                <div className="text-[10px] uppercase text-slate-500">{x.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Conclusions */}
      <div className="panel p-4">
        <SectionTitle right={<ListChecks size={14} className="text-brand" />}>6. Conclusiones automáticas</SectionTitle>
        <ul className="space-y-2">
          {r.conclusions.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* 7. Recommendations */}
      <div className="panel p-4">
        <SectionTitle right={<Lightbulb size={14} className="text-warn" />}>7. Recomendaciones</SectionTitle>
        <ul className="space-y-2">
          {r.recommendations.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-line bg-base-700/40 p-3 text-center text-[11px] text-slate-500">
        Documento generado por el Control Tower Inteligente · Información simulada, no utilizar como dato operacional real.
      </div>
    </div>
  );
}
