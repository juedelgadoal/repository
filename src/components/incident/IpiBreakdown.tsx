"use client";

import type { Incident } from "@/lib/types";
import { IPI_WEIGHTS, ipiBand } from "@/lib/ipi";
import { Progress } from "@/components/ui/primitives";

const ROWS: { key: keyof typeof IPI_WEIGHTS; label: string }[] = [
  { key: "severity", label: "Severidad" },
  { key: "slaUrgency", label: "Urgencia SLA" },
  { key: "clientPriority", label: "Prioridad cliente" },
  { key: "typeWeight", label: "Tipo de incidente" },
  { key: "routeRisk", label: "Riesgo de ruta" },
  { key: "value", label: "Valor mercancía" },
  { key: "kpiImpact", label: "Impacto en KPIs" },
];

export function IpiBreakdown({ inc }: { inc: Incident }) {
  const band = ipiBand(inc.ipi);
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl font-mono text-2xl font-bold"
          style={{ background: band.color + "22", color: band.color, boxShadow: `0 0 20px -6px ${band.color}` }}
        >
          {inc.ipi}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100">Índice de Prioridad · {band.label}</div>
          <div className="text-[11px] text-slate-500">Cálculo dinámico ponderado (0–100)</div>
        </div>
      </div>
      <div className="space-y-2">
        {ROWS.map((r) => {
          const raw = inc.ipiBreakdown[r.key];
          const weight = IPI_WEIGHTS[r.key];
          return (
            <div key={r.key}>
              <div className="mb-0.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {r.label} <span className="text-slate-600">· peso {(weight * 100).toFixed(0)}%</span>
                </span>
                <span className="font-mono tabular-nums text-slate-300">{raw}</span>
              </div>
              <Progress value={raw} color={band.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
