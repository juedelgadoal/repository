"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3, FileText, LayoutDashboard, Radar, ShieldAlert } from "lucide-react";
import { useSimulation } from "@/store/useSimulation";

const NAV = [
  { href: "/control", label: "Centro de Control", icon: LayoutDashboard },
  { href: "/incidentes", label: "Gestión de Incidentes", icon: ShieldAlert },
  { href: "/analitica", label: "Analítica", icon: BarChart3 },
  { href: "/reporte", label: "Reporte Ejecutivo", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const openIncidents = useSimulation((s) => s.kpis.openIncidents);
  const criticals = useSimulation((s) => s.kpis.criticalIncidents);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-base-800/70 lg:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 shadow-glow">
          <Radar size={18} className="text-brand" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-100">Control Tower</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Inteligente · GEODIS</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href === "/control" && pathname === "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-brand/15 text-brand shadow-glow"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon size={17} />
                {item.label}
              </span>
              {item.href === "/incidentes" && openIncidents > 0 && (
                <span
                  className={clsx(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    criticals > 0 ? "bg-crit/20 text-crit" : "bg-warn/20 text-warn"
                  )}
                >
                  {openIncidents}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div className="rounded-lg border border-line bg-base-700/60 p-3 text-[11px] leading-relaxed text-slate-500">
          <p className="mb-1 font-medium text-slate-400">MVP · Datos simulados</p>
          Operación de transporte terrestre ficticia. Preparado para integrar TMS y matriz de
          riesgos corporativa.
        </div>
      </div>
    </aside>
  );
}
