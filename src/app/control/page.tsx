"use client";

import dynamic from "next/dynamic";
import { KpiBar } from "@/components/control/KpiBar";
import { AlertsPanel } from "@/components/control/AlertsPanel";
import { IncidentsTable } from "@/components/control/IncidentsTable";
import { MapLegend } from "@/components/control/MapLegend";
import { SectionTitle } from "@/components/ui/primitives";
import { useSimulation } from "@/store/useSimulation";
import { Loader2, MapPin } from "lucide-react";

const MapView = dynamic(() => import("@/components/control/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-slate-500">
      <Loader2 className="mr-2 animate-spin" size={18} /> Cargando mapa operacional…
    </div>
  ),
});

export default function ControlPage() {
  const openIncidents = useSimulation((s) => s.kpis.openIncidents);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <KpiBar />

      <div className="grid min-h-[400px] flex-1 grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-line bg-base-800 xl:col-span-2">
          <div className="absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-lg border border-line bg-base-800/85 px-3 py-1.5 backdrop-blur">
            <MapPin size={14} className="text-brand" />
            <span className="text-xs font-medium text-slate-200">Mapa operacional · Colombia</span>
          </div>
          <MapView />
          <MapLegend />
        </div>

        <div className="min-h-[300px]">
          <AlertsPanel />
        </div>
      </div>

      <div className="panel flex max-h-[36vh] min-h-[220px] flex-col">
        <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
          <SectionTitle>Cola de incidentes · priorizada por IPI</SectionTitle>
          <span className="text-[11px] text-slate-500">{openIncidents} abiertos</span>
        </div>
        <IncidentsTable />
      </div>
    </div>
  );
}
