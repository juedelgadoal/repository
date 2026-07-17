"use client";

import { useEffect } from "react";
import { useSimulation } from "@/store/useSimulation";

const TICK_MS = 1500;

// Drives the live simulation clock on the client.
export function SimProvider({ children }: { children: React.ReactNode }) {
  const start = useSimulation((s) => s.start);
  const tick = useSimulation((s) => s.tick);

  useEffect(() => {
    start();
    const id = setInterval(() => tick(), TICK_MS);
    return () => clearInterval(id);
  }, [start, tick]);

  return <>{children}</>;
}
