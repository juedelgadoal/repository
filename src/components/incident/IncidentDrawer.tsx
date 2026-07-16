"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useSimulation } from "@/store/useSimulation";
import { IncidentDetail } from "./IncidentDetail";
import { VehicleInfo } from "./VehicleInfo";

export function IncidentDrawer() {
  const selectedIncidentId = useSimulation((s) => s.selectedIncidentId);
  const selectedVehicleId = useSimulation((s) => s.selectedVehicleId);
  const vehicles = useSimulation((s) => s.vehicles);
  const selectIncident = useSimulation((s) => s.selectIncident);
  const selectVehicle = useSimulation((s) => s.selectVehicle);

  // If a selected vehicle has an active incident, prefer showing the incident.
  const vehicle = selectedVehicleId ? vehicles.find((v) => v.id === selectedVehicleId) : null;
  const incidentFromVehicle = vehicle?.incidentId ?? null;
  const incidentId = selectedIncidentId ?? incidentFromVehicle;
  const showVehicle = !incidentId && !!selectedVehicleId;
  const open = !!incidentId || showVehicle;

  const close = () => {
    selectIncident(null);
    selectVehicle(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={close} />
      <aside className="relative flex h-full w-full max-w-2xl animate-slideIn flex-col border-l border-line bg-base-800 shadow-2xl">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {incidentId ? "Gestión del incidente" : "Detalle del vehículo"}
          </span>
          <button onClick={close} className="btn-ghost h-9 w-9 p-0" title="Cerrar (Esc)">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {incidentId ? <IncidentDetail incidentId={incidentId} /> : showVehicle ? <VehicleInfo vehicleId={selectedVehicleId!} /> : null}
        </div>
      </aside>
    </div>
  );
}
