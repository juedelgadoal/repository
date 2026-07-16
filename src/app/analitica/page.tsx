"use client";

import { useMemo } from "react";
import { useSimulation } from "@/store/useSimulation";
import { analytics } from "@/lib/analytics";
import type { SimState } from "@/lib/types";
import { SectionTitle } from "@/components/ui/primitives";
import { CostTrend, Donut, HBar, Trend, VBar } from "@/components/analytics/Charts";
import { Heatmap } from "@/components/analytics/Heatmap";
import { copShort, fmtMin, pct } from "@/lib/format";

function Panel({ title, children, span }: { title: string; children: React.ReactNode; span?: string }) {
  return (
    <div className={`panel p-4 ${span ?? ""}`}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

export default function AnaliticaPage() {
  // subscribe to values that change so charts refresh
  const state = useSimulation((s) => s) as unknown as SimState;
  const now = useSimulation((s) => s.now);
  const data = useMemo(() => analytics(state), [now]); // eslint-disable-line react-hooks/exhaustive-deps
  const k = state.kpis;

  return (
    <div className="space-y-3 p-3">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { l: "Cumplimiento SLA", v: pct(k.slaCompliance), c: "#22c55e" },
          { l: "Costo generado", v: copShort(k.costGeneratedCop), c: "#ef4444" },
          { l: "Costo evitado", v: copShort(k.costAvoidedCop), c: "#22c55e" },
          { l: "T. reacción prom.", v: fmtMin(k.avgReactionMin), c: "#22d3ee" },
          { l: "T. resolución prom.", v: fmtMin(k.avgResolutionMin), c: "#3b82f6" },
          { l: "Total incidentes", v: String(data.total), c: "#a855f7" },
        ].map((s) => (
          <div key={s.l} className="card p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">{s.l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums" style={{ color: s.c }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="Evolución de KPIs (SLA · OTIF · Plan)">
          <Trend data={data.history} />
        </Panel>
        <Panel title="Costo generado vs. evitado (millones COP)">
          <CostTrend data={data.history} />
        </Panel>

        <Panel title="Incidentes por tipo">
          <Donut data={data.byType} />
        </Panel>
        <Panel title="Incidentes por ciudad">
          <HBar data={data.byCity} color="#3b82f6" />
        </Panel>

        <Panel title="Incidentes por transportadora">
          <HBar data={data.byCarrier} color="#a855f7" />
        </Panel>
        <Panel title="Rutas con mayor número de incidentes">
          <HBar data={data.byRoute} color="#f59e0b" />
        </Panel>

        <Panel title="Horarios críticos (incidentes por hora)" span="lg:col-span-2">
          <VBar data={data.byHour} />
        </Panel>

        <Panel title="Mapa de calor · ciudad × tipo de incidente" span="lg:col-span-2">
          <Heatmap data={data} />
        </Panel>
      </div>
    </div>
  );
}
