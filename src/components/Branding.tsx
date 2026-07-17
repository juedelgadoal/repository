"use client";

import { useEffect, useState } from "react";

/**
 * GEODIS branding — PLACEHOLDER wordmark only.
 * Replace `<GeodisWordmark />` with the official logo asset (SVG/PNG) when available.
 */
export function GeodisWordmark({ className }: { className?: string }) {
  return (
    <span className={className} style={{ fontWeight: 800, letterSpacing: "0.04em" }}>
      GE<span style={{ color: "#e2231a" }}>O</span>DIS
    </span>
  );
}

/** Faint full-page watermark behind the dashboard. */
export function GeodisWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 grid place-items-center overflow-hidden"
    >
      <GeodisWordmark className="rotate-[-8deg] whitespace-nowrap text-[22vw] text-slate-200 opacity-[0.035]" />
    </div>
  );
}

/** Startup splash with the GEODIS placeholder wordmark; fades out after ~1.8s. */
export function GeodisSplash() {
  const [gone, setGone] = useState(false);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1500);
    const t2 = setTimeout(() => setGone(true), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  if (gone) return null;
  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center transition-opacity duration-500"
      style={{
        background: "radial-gradient(circle at 50% 38%, #0b1424, #05080f)",
        opacity: fade ? 0 : 1,
      }}
    >
      <div className="animate-fadeIn text-center">
        <GeodisWordmark className="text-6xl text-slate-100" />
        <div className="mt-3 text-xs uppercase tracking-[0.32em] text-slate-500">Control Tower Inteligente</div>
        <div className="mx-auto mt-5 h-[3px] w-52 overflow-hidden rounded bg-white/10">
          <div className="h-full rounded bg-brand" style={{ width: "100%", animation: "loadbar 1.6s ease forwards" }} />
        </div>
      </div>
      <style>{`@keyframes loadbar{from{width:0}to{width:100%}}`}</style>
    </div>
  );
}
