"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("card p-4", className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{children}</h3>
      {right}
    </div>
  );
}

export function Badge({
  color,
  children,
  glow,
  className,
}: {
  color?: string;
  children: ReactNode;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx("chip border", className)}
      style={{
        color: color ?? "#cbd5e1",
        borderColor: (color ?? "#64748b") + "55",
        background: (color ?? "#64748b") + "1a",
        boxShadow: glow ? `0 0 10px -2px ${color ?? "#64748b"}` : undefined,
      }}
    >
      {children}
    </span>
  );
}

export function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-pulseRing"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

export function Progress({ value, color = "#22d3ee" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}
