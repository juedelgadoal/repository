"use client";

import { Fragment, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  CircleMarker,
  Popup,
  Tooltip,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import { useSimulation } from "@/store/useSimulation";
import { CITIES, MAP_POIS, critBand } from "@/lib/domain";
import { VEHICLE_STATUS_UI, SEVERITY_UI } from "@/lib/ui";
import type { Vehicle } from "@/lib/types";

const POI_STYLE: Record<string, { color: string; glyph: string }> = {
  peaje: { color: "#38bdf8", glyph: "$" },
  descanso: { color: "#22c55e", glyph: "P" },
  clima: { color: "#60a5fa", glyph: "☁" },
  bloqueo: { color: "#f59e0b", glyph: "✕" },
  riesgo: { color: "#ef4444", glyph: "!" },
};

// Mini-truck (top view, points north; rotated by heading, colored by status).
function truckIcon(v: Vehicle, selected: boolean) {
  const color = VEHICLE_STATUS_UI[v.status].color;
  const incident = v.status === "en_incidente" || v.status === "detenido";
  const s = selected ? 30 : 22;
  return L.divIcon({
    className: "",
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    html: `<div style="width:${s}px;height:${s}px;transform:rotate(${v.heading}deg);filter:drop-shadow(0 0 ${
      incident ? 5 : 2
    }px ${color}${incident ? "cc" : "88"})">
      <svg viewBox="-12 -12 24 24" width="${s}" height="${s}">
        <path d="M0,-8.4 L2.7,-5.2 L-2.7,-5.2 Z" fill="${color}"/>
        <rect x="-3.5" y="-6" width="7" height="12.4" rx="1.4" fill="${color}" stroke="#05080f" stroke-width=".5"/>
        <rect x="-2.9" y="-5.4" width="5.8" height="3.4" rx=".8" fill="#e6eefc" opacity=".9"/>
        <line x1="-3.5" y1="-1.6" x2="3.5" y2="-1.6" stroke="#05080f" stroke-width=".6" opacity=".5"/>
        ${selected ? `<circle cx="0" cy="0" r="10" fill="none" stroke="${color}" stroke-width="1.2"/>` : ""}
      </svg>
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
      <span style="color:#e2e8f0;font-size:11px;font-weight:600;white-space:nowrap;text-shadow:0 1px 3px #000, 0 0 3px #000">${name}</span>
    </div>`,
  });
}

function blockIcon() {
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div style="position:relative;width:18px;height:18px;color:#ef4444;filter:drop-shadow(0 0 3px #ef4444)">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="10" y="3" width="4" height="18" rx="1"/></svg>
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

  // Unique corridors by geometry, styled by criticality band.
  const corridorLines = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; pts: [number, number][]; risk: number }[] = [];
    for (const r of routes) {
      const key = r.corridorKey + "|" + r.waypoints.map((p) => p.join()).join("_");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, pts: r.waypoints, risk: r.riskLevel });
    }
    return out;
  }, [routes]);

  const openIncidents = incidents.filter((i) => i.status !== "resuelto");
  const reroutes = openIncidents
    .filter((i) => i.reroute)
    .map((i) => routes.find((r) => r.id === i.routeId))
    .filter((r): r is NonNullable<typeof r> => !!r && !!r.altWaypoints);

  return (
    <MapContainer center={[4.6, -74.5]} zoom={6} className="h-full w-full" zoomControl attributionControl>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Relieve (OpenTopoMap)">
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenTopoMap · OSM · Control Tower (datos simulados)'
            maxZoom={17}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Oscuro">
          <TileLayer
            url="https://{s}.basemap.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CARTO · OSM · Control Tower (datos simulados)'
            subdomains="abcd"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite / calles (OSM)">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap · Control Tower (datos simulados)'
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* corridors by criticality: glow underlay + colored line */}
      {corridorLines.map((c) => {
        const b = critBand(c.risk);
        return (
          <Fragment key={c.key}>
            {b.glow && (
              <Polyline positions={c.pts} pathOptions={{ color: b.color, weight: b.weight * 2.4, opacity: 0.14 }} />
            )}
            <Polyline positions={c.pts} pathOptions={{ color: b.color, weight: b.weight, opacity: 0.85 }}>
              <Tooltip sticky>{`${b.label} · riesgo ${c.risk.toFixed(1)}`}</Tooltip>
            </Polyline>
          </Fragment>
        );
      })}

      {/* alternate (reroute) paths */}
      {reroutes.map((r) => (
        <Polyline
          key={"alt-" + r.id}
          positions={r.altWaypoints!}
          pathOptions={{ color: "#f59e0b", weight: 3.5, opacity: 0.9, className: "road-alt" }}
        >
          <Tooltip sticky>Ruta alterna (desvío por bloqueo)</Tooltip>
        </Polyline>
      ))}

      {CITIES.map((city) => (
        <Marker key={city.id} position={city.coord} icon={cityIcon(city.name, city.riskZone)} />
      ))}

      {MAP_POIS.map((poi) => (
        <Marker key={poi.id} position={poi.coord} icon={poiIcon(poi.kind)}>
          <Tooltip direction="top">{poi.label}</Tooltip>
        </Marker>
      ))}

      {/* incident halos (fixed at detection / blockage point) */}
      {openIncidents.map((inc) => {
        const at = inc.reroute && inc.blockCoord ? inc.blockCoord : inc.coord;
        return (
          <CircleMarker
            key={"halo-" + inc.id}
            center={at}
            radius={inc.severity === "critica" ? 16 : 11}
            pathOptions={{
              color: SEVERITY_UI[inc.severity].color,
              fillColor: SEVERITY_UI[inc.severity].color,
              fillOpacity: selectedIncidentId === inc.id ? 0.35 : 0.15,
              weight: 1,
            }}
            eventHandlers={{ click: () => selectIncident(inc.id) }}
          />
        );
      })}

      {/* blockage markers where a reroute is active */}
      {openIncidents
        .filter((i) => i.reroute && i.blockCoord)
        .map((inc) => (
          <Marker
            key={"block-" + inc.id}
            position={inc.blockCoord!}
            icon={blockIcon()}
            eventHandlers={{ click: () => selectIncident(inc.id) }}
          >
            <Tooltip direction="top">Bloqueo · desvío activo</Tooltip>
          </Marker>
        ))}

      {vehicles.map((v) => (
        <Marker
          key={v.id}
          position={v.coord}
          icon={truckIcon(v, selectedVehicleId === v.id)}
          eventHandlers={{ click: () => selectVehicle(v.id) }}
          zIndexOffset={v.status === "en_incidente" ? 1000 : 0}
        >
          <Popup>
            <div className="text-xs">
              <div className="font-semibold text-slate-100">{v.plate}</div>
              <div className="text-slate-400">{VEHICLE_STATUS_UI[v.status].label}</div>
              <div className="mt-1 text-slate-400">
                {Math.round(v.speedKmh)} km/h · ETA {Math.round(v.etaMin)} min
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
