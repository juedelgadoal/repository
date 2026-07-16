"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useSimulation } from "@/store/useSimulation";
import { CITIES, MAP_POIS } from "@/lib/domain";
import { VEHICLE_STATUS_UI } from "@/lib/ui";
import { SEVERITY_UI } from "@/lib/ui";
import type { Vehicle } from "@/lib/types";

const POI_STYLE: Record<string, { color: string; glyph: string }> = {
  peaje: { color: "#38bdf8", glyph: "$" },
  descanso: { color: "#22c55e", glyph: "P" },
  clima: { color: "#60a5fa", glyph: "☁" },
  bloqueo: { color: "#f59e0b", glyph: "✕" },
  riesgo: { color: "#ef4444", glyph: "!" },
};

function vehicleIcon(v: Vehicle, selected: boolean) {
  const color = VEHICLE_STATUS_UI[v.status].color;
  const incident = v.status === "en_incidente" || v.status === "detenido";
  const size = selected ? 26 : 18;
  const ring = incident
    ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color}33;animation:pulseRing 1.6s ease-out infinite"></span>`
    : "";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      ${ring}
      <div style="position:relative;width:${size}px;height:${size}px;transform:rotate(${v.heading}deg);
        display:flex;align-items:center;justify-content:center;color:${color};
        filter:drop-shadow(0 0 4px ${color}aa)">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}">
          <path d="M12 2 L19 20 L12 16 L5 20 Z"/>
        </svg>
      </div>
      ${selected ? `<div style="position:absolute;inset:-8px;border:2px solid ${color};border-radius:9999px"></div>` : ""}
    </div>`,
  });
}

function poiIcon(kind: string) {
  const s = POI_STYLE[kind];
  return L.divIcon({
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<div style="width:16px;height:16px;border-radius:4px;background:${s.color}22;border:1px solid ${s.color};
      display:flex;align-items:center;justify-content:center;color:${s.color};font-size:10px;font-weight:700">${s.glyph}</div>`,
  });
}

function cityIcon(name: string, risk: boolean) {
  const color = risk ? "#f59e0b" : "#22d3ee";
  return L.divIcon({
    className: "",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    html: `<div style="display:flex;align-items:center;gap:4px">
      <div style="width:9px;height:9px;border-radius:9999px;background:${color};box-shadow:0 0 8px ${color}"></div>
      <span style="color:#cbd5e1;font-size:11px;font-weight:600;white-space:nowrap;text-shadow:0 1px 3px #000">${name}</span>
    </div>`,
  });
}

export default function MapView() {
  const vehicles = useSimulation((s) => s.vehicles);
  const routes = useSimulation((s) => s.routes);
  const incidents = useSimulation((s) => s.incidents);
  const selectedVehicleId = useSimulation((s) => s.selectedVehicleId);
  const selectedIncidentId = useSimulation((s) => s.selectedIncidentId);
  const selectVehicle = useSimulation((s) => s.selectVehicle);
  const selectIncident = useSimulation((s) => s.selectIncident);

  // Unique corridor polylines (dedupe route padding clones)
  const corridorLines = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; pts: [number, number][]; critical: boolean }[] = [];
    for (const r of routes) {
      const key = r.waypoints.map((p) => p.join()).join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, pts: r.waypoints, critical: r.criticalCorridor });
    }
    return out;
  }, [routes]);

  const openIncidents = incidents.filter((i) => i.status !== "resuelto");

  return (
    <MapContainer
      center={[4.2, -75.5]}
      zoom={6}
      className="h-full w-full"
      zoomControl={true}
      attributionControl={true}
      preferCanvas
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap · Control Tower (datos simulados)'
      />

      {corridorLines.map((c) => (
        <Polyline
          key={c.key}
          positions={c.pts}
          pathOptions={{
            color: c.critical ? "#ef4444" : "#22d3ee",
            weight: c.critical ? 2.5 : 1.5,
            opacity: c.critical ? 0.55 : 0.35,
            dashArray: c.critical ? undefined : "4 6",
          }}
        />
      ))}

      {CITIES.map((city) => (
        <Marker key={city.id} position={city.coord} icon={cityIcon(city.name, city.riskZone)} />
      ))}

      {MAP_POIS.map((poi) => (
        <Marker key={poi.id} position={poi.coord} icon={poiIcon(poi.kind)}>
          <Tooltip direction="top">{poi.label}</Tooltip>
        </Marker>
      ))}

      {/* Incident halos */}
      {openIncidents.map((inc) => (
        <CircleMarker
          key={"halo-" + inc.id}
          center={inc.coord}
          radius={inc.severity === "critica" ? 16 : 11}
          pathOptions={{
            color: SEVERITY_UI[inc.severity].color,
            fillColor: SEVERITY_UI[inc.severity].color,
            fillOpacity: selectedIncidentId === inc.id ? 0.35 : 0.15,
            weight: 1,
          }}
          eventHandlers={{ click: () => selectIncident(inc.id) }}
        />
      ))}

      {vehicles.map((v) => (
        <Marker
          key={v.id}
          position={v.coord}
          icon={vehicleIcon(v, selectedVehicleId === v.id)}
          eventHandlers={{ click: () => selectVehicle(v.id) }}
          zIndexOffset={v.status === "en_incidente" ? 1000 : 0}
        >
          <Popup>
            <div className="text-xs">
              <div className="font-semibold text-slate-100">{v.plate}</div>
              <div className="text-slate-400">{VEHICLE_STATUS_UI[v.status].label}</div>
              <div className="mt-1 text-slate-400">{Math.round(v.speedKmh)} km/h · ETA {Math.round(v.etaMin)} min</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
