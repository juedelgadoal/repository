"use client";

const ROADS = [
  { c: "#ef4444", label: "Crítico" },
  { c: "#f97316", label: "Alto" },
  { c: "#eab308", label: "Medio" },
  { c: "#22c55e", label: "Bajo" },
];
const DOTS = [
  { c: "#22c55e", label: "Truck en ruta" },
  { c: "#ef4444", label: "Truck en incidente" },
  { c: "#f59e0b", label: "Ruta alterna (desvío)", line: true },
];

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-line bg-base-800/85 p-2.5 backdrop-blur">
      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Criticidad de la vía</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {ROADS.map((i) => (
          <div key={i.label} className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="h-0.5 w-4 rounded" style={{ background: i.c }} />
            {i.label}
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1 border-t border-line pt-2">
        {DOTS.map((i) => (
          <div key={i.label} className="flex items-center gap-2 text-[10px] text-slate-400">
            {i.line ? (
              <span className="h-0.5 w-4 rounded" style={{ background: i.c }} />
            ) : (
              <span className="h-2 w-2 rounded-full" style={{ background: i.c }} />
            )}
            {i.label}
          </div>
        ))}
      </div>
    </div>
  );
}
