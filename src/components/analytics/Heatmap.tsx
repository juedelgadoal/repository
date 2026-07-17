"use client";

import type { Analytics } from "@/lib/analytics";

export function Heatmap({ data }: { data: Analytics }) {
  const max = Math.max(1, ...data.heat.flatMap((r) => r.cells.map((c) => c.value)));
  if (data.heat.length === 0) return <div className="p-6 text-center text-xs text-slate-500">Sin datos suficientes.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-[10px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-base-800 px-1 text-left text-slate-500"></th>
            {data.types.map((t) => (
              <th key={t} className="max-w-[40px] px-1 text-slate-500">
                <div className="mx-auto h-16 w-4 origin-bottom-left translate-x-3 translate-y-2 rotate-[-55deg] whitespace-nowrap text-left">
                  {t.split(" ")[0]}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.heat.map((row) => (
            <tr key={row.city}>
              <td className="sticky left-0 bg-base-800 pr-2 text-right font-medium text-slate-400">{row.city}</td>
              {row.cells.map((cell) => {
                const intensity = cell.value / max;
                return (
                  <td key={cell.type} className="p-0">
                    <div
                      className="flex h-7 w-9 items-center justify-center rounded"
                      style={{
                        background:
                          cell.value === 0 ? "#0f172a" : `rgba(239,68,68,${0.15 + intensity * 0.75})`,
                        color: intensity > 0.5 ? "#fff" : "#94a3b8",
                      }}
                      title={`${row.city} · ${cell.type}: ${cell.value}`}
                    >
                      {cell.value || ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
