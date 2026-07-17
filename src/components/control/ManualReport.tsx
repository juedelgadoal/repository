"use client";

import { useMemo, useState } from "react";
import { ClipboardPen, X } from "lucide-react";
import { useSimulation } from "@/store/useSimulation";
import { INCIDENT_TYPE_LIST } from "@/lib/domain";
import type { IncidentType } from "@/lib/types";

const CRIT_COLOR: Record<string, string> = {
  Crítico: "#ef4444",
  Alto: "#f97316",
  Medio: "#eab308",
  Bajo: "#22c55e",
};

export function ManualReport() {
  const routes = useSimulation((s) => s.routes);
  const report = useSimulation((s) => s.manualReport);
  const [open, setOpen] = useState(false);

  // one route per corridor (dedupe the padded/reverse variants for the picker)
  const corridors = useMemo(() => {
    const seen = new Set<string>();
    return routes.filter((r) => {
      if (seen.has(r.corridorKey) || r.tramos.length === 0) return false;
      seen.add(r.corridorKey);
      return true;
    });
  }, [routes]);

  const [routeId, setRouteId] = useState("");
  const [tramoIdx, setTramoIdx] = useState(0);
  const [type, setType] = useState<IncidentType>("bloqueo_vial");

  const activeRoute = routes.find((r) => r.id === (routeId || corridors[0]?.id));

  const submit = () => {
    const rid = routeId || corridors[0]?.id;
    if (!rid) return;
    report(rid, tramoIdx, type);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn inline-flex items-center gap-2 rounded-lg border border-crit/40 bg-crit/15 px-3 py-2 text-sm font-medium text-crit hover:bg-crit/25"
      >
        <ClipboardPen size={15} />
        <span className="hidden sm:inline">Reporte manual</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fadeIn" onClick={() => setOpen(false)} />
          <div className="panel relative w-full max-w-md animate-fadeIn p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Reporte manual del operador</h3>
              <button onClick={() => setOpen(false)} className="btn-ghost h-8 w-8 p-0">
                <X size={15} />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              El operador de monitoreo reporta un incidente detectado en el tracking. Se ubica en el tramo y se conecta
              con la visualización en tiempo real.
            </p>

            <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Ruta / corredor</label>
            <select
              value={routeId || corridors[0]?.id}
              onChange={(e) => {
                setRouteId(e.target.value);
                setTramoIdx(0);
              }}
              className="mb-3 w-full rounded-lg border border-line bg-base-700/60 px-3 py-2 text-sm text-slate-200 focus:border-brand/50 focus:outline-none"
            >
              {corridors.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Tramo (con criticidad)</label>
            <select
              value={tramoIdx}
              onChange={(e) => setTramoIdx(Number(e.target.value))}
              className="mb-3 w-full rounded-lg border border-line bg-base-700/60 px-3 py-2 text-sm text-slate-200 focus:border-brand/50 focus:outline-none"
            >
              {(activeRoute?.tramos ?? []).map((t, i) => (
                <option key={i} value={i}>
                  {t.name} — {t.crit}
                </option>
              ))}
            </select>

            <div className="mb-4 flex items-center gap-2 text-[11px]">
              <span className="text-slate-500">Criticidad del tramo:</span>
              {activeRoute?.tramos[tramoIdx] && (
                <span
                  className="rounded-full px-2 py-0.5 font-semibold"
                  style={{
                    color: CRIT_COLOR[activeRoute.tramos[tramoIdx].crit],
                    background: CRIT_COLOR[activeRoute.tramos[tramoIdx].crit] + "22",
                  }}
                >
                  {activeRoute.tramos[tramoIdx].crit}
                </span>
              )}
            </div>

            <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Tipo de incidente</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as IncidentType)}
              className="mb-5 w-full rounded-lg border border-line bg-base-700/60 px-3 py-2 text-sm text-slate-200 focus:border-brand/50 focus:outline-none"
            >
              {INCIDENT_TYPE_LIST.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button
                onClick={submit}
                className="btn flex-1 rounded-lg border border-crit/40 bg-crit/15 text-crit hover:bg-crit/25"
              >
                Reportar en el mapa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
