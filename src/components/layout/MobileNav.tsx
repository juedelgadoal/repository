"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3, FileText, LayoutDashboard, ShieldAlert } from "lucide-react";

const NAV = [
  { href: "/control", label: "Control", icon: LayoutDashboard },
  { href: "/incidentes", label: "Incidentes", icon: ShieldAlert },
  { href: "/analitica", label: "Analítica", icon: BarChart3 },
  { href: "/reporte", label: "Reporte", icon: FileText },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex shrink-0 items-center justify-around border-t border-line bg-base-800/90 backdrop-blur lg:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href || (item.href === "/control" && pathname === "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px]",
              active ? "text-brand" : "text-slate-500"
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
