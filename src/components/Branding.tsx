"use client";

import { useEffect, useState } from "react";

// Official GEODIS logo asset (provided by the user), served from /public.
const LOGO_SRC = "/geodis-logo.png";

/** GEODIS logo — official asset. */
export function GeodisLogo({ className, alt = "GEODIS" }: { className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={LOGO_SRC} alt={alt} className={className} draggable={false} />;
}

/** Text wordmark fallback (kept for places that only need the name). */
export function GeodisWordmark({ className }: { className?: string }) {
  return (
    <span className={className} style={{ fontWeight: 800, letterSpacing: "0.04em" }}>
      GE<span style={{ color: "#4b1fd6" }}>O</span>DIS
    </span>
  );
}

/** Faint full-page watermark behind the dashboard (text wordmark — the logo
 *  asset has a white background, which would read as a box at low opacity). */
export function GeodisWatermark() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 grid place-items-center overflow-hidden">
      <GeodisWordmark className="rotate-[-8deg] whitespace-nowrap text-[22vw] text-[#4b1fd6] opacity-[0.06]" />
    </div>
  );
}

/** Startup splash with the GEODIS logo on a clean plate; fades out after ~1.8s. */
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
      style={{ background: "radial-gradient(circle at 50% 38%, #0e1330, #05080f)", opacity: fade ? 0 : 1 }}
    >
      <div className="animate-fadeIn text-center">
        <div className="mx-auto grid h-32 w-32 place-items-center rounded-2xl bg-white p-4 shadow-[0_0_40px_-6px_rgba(75,31,214,0.55)]">
          <GeodisLogo className="h-full w-auto" />
        </div>
        <div className="mt-5 text-xs uppercase tracking-[0.32em] text-slate-400">Control Tower Inteligente</div>
        <div className="mx-auto mt-5 h-[3px] w-52 overflow-hidden rounded bg-white/10">
          <div className="h-full rounded bg-brand" style={{ animation: "loadbar 1.6s ease forwards" }} />
        </div>
      </div>
      <style>{`@keyframes loadbar{from{width:0}to{width:100%}}`}</style>
    </div>
  );
}
