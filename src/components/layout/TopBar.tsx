"use client";

import { Activity, Pause, Play, RotateCcw, Gauge } from "lucide-react";
import { useSimulation } from "@/store/useSimulation";
import { fmtClock } from "@/lib/format";
import { Dot } from "@/components/ui/primitives";
import clsx from "clsx";

const SPEEDS = [15, 45, 120];

export function TopBar() {
  const now = useSimulation((s) => s.now);
  const running = useSimulation((s) => s.running);
  const speed = useSimulation((s) => s.speed);
  const kpis = useSimulation((s) => s.kpis);
  const setRunning = useSimulation((s) => s.setRunning);
  const setSpeed = useSimulation((s) => s.setSpeed);
  const reset = useSimulation((s) => s.reset);

  const opState =
    kpis.criticalIncidents > 0 ? "critico" : kpis.openIncidents > 4 ? "alerta" : "normal";
  const opUi = {
    normal: { label: "Operación normal", color: "#22c55e" },
    alerta: { label: "Operación en alerta", color: "#f59e0b" },
    critico: { label: "Operación crítica", color: "#ef4444" },
  }[opState];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-base-900/85 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <Dot color={opUi.color} pulse />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-100">{opUi.label}</div>
          <div className="text-[11px] text-slate-500">
            {kpis.activeVehicles} vehículos · {kpis.openIncidents} incidentes abiertos
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Activity size={15} className="text-brand" />
        <span className="font-mono text-lg font-semibold tracking-tight text-slate-100 tabular-nums">
          {fmtClock(now)}
        </span>
        <span className="text-[11px] text-slate-500">hora operación (simulada)</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-base-700 p-0.5">
          <Gauge size={13} className="ml-1 text-slate-500" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={clsx(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                speed === s ? "bg-brand/20 text-brand" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {s}×
            </button>
          ))}
        </div>
        <button
          onClick={() => setRunning(!running)}
          className="btn-ghost h-9 px-3"
          title={running ? "Pausar" : "Reanudar"}
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button onClick={reset} className="btn-ghost h-9 px-3" title="Reiniciar simulación">
          <RotateCcw size={15} />
        </button>
      </div>
    </header>
  );
}
