"use client";

const ITEMS = [
  { c: "#22c55e", label: "En ruta" },
  { c: "#f59e0b", label: "Detenido" },
  { c: "#ef4444", label: "En incidente" },
  { c: "#ef4444", label: "Corredor crítico", line: true },
  { c: "#22d3ee", label: "Corredor estándar", line: true },
];

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-line bg-base-800/85 p-2.5 backdrop-blur">
      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Leyenda</div>
      <div className="grid grid-cols-1 gap-1">
        {ITEMS.map((i) => (
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
