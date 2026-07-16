"use client";

import { AlertTriangle, Bell, Info, ShieldAlert } from "lucide-react";
import { useSimulation } from "@/store/useSimulation";
import { fmtTime } from "@/lib/format";
import { SectionTitle } from "@/components/ui/primitives";
import clsx from "clsx";

const LEVEL_UI = {
  info: { color: "#3b82f6", icon: Info },
  warn: { color: "#f59e0b", icon: AlertTriangle },
  crit: { color: "#ef4444", icon: ShieldAlert },
};

export function AlertsPanel() {
  const alerts = useSimulation((s) => s.alerts);
  const selectIncident = useSimulation((s) => s.selectIncident);
  const selectVehicle = useSimulation((s) => s.selectVehicle);
  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="panel flex h-full flex-col">
      <div className="border-b border-line p-3">
        <SectionTitle
          right={
            unread > 0 ? (
              <span className="flex items-center gap-1 rounded-full bg-crit/20 px-2 py-0.5 text-[10px] font-semibold text-crit">
                <Bell size={11} /> {unread} nuevas
              </span>
            ) : undefined
          }
        >
          Panel de Alertas
        </SectionTitle>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {alerts.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">Sin alertas. Operación estable.</div>
        )}
        {alerts.map((a) => {
          const ui = LEVEL_UI[a.level];
          const Icon = ui.icon;
          return (
            <button
              key={a.id}
              onClick={() => {
                if (a.incidentId) selectIncident(a.incidentId);
                if (a.vehicleId) selectVehicle(a.vehicleId);
              }}
              className={clsx(
                "flex w-full animate-slideIn gap-2.5 rounded-lg border border-line bg-base-700/50 p-2.5 text-left transition-colors hover:bg-base-600/60",
                !a.read && "ring-1 ring-inset"
              )}
              style={{ boxShadow: !a.read ? `inset 0 0 0 1px ${ui.color}44` : undefined }}
            >
              <span className="mt-0.5 shrink-0" style={{ color: ui.color }}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-slate-200">{a.title}</span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">{fmtTime(a.t)}</span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">{a.detail}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
