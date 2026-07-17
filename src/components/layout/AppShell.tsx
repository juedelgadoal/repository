"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { IncidentDrawer } from "@/components/incident/IncidentDrawer";
import { GeodisSplash, GeodisWatermark } from "@/components/Branding";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GeodisWatermark />
      <GeodisSplash />
      <div className="relative z-[1] flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          <MobileNav />
        </div>
        <IncidentDrawer />
      </div>
    </>
  );
}
