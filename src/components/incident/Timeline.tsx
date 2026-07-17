"use client";

import type { Incident } from "@/lib/types";
import { fmtTime } from "@/lib/format";
import clsx from "clsx";

const KIND_COLOR: Record<string, string> = {
  system: "#64748b",
  action: "#22d3ee",
  alert: "#f59e0b",
  comm: "#3b82f6",
  escalation: "#ef4444",
};

export function Timeline({ inc }: { inc: Incident }) {
  const events = [...inc.timeline].sort((a, b) => a.t - b.t);
  return (
    <ol className="relative space-y-3 pl-4">
      <span className="absolute left-[3px] top-1 h-[calc(100%-0.5rem)] w-px bg-line" />
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className="absolute -left-[13px] top-1 h-2 w-2 rounded-full ring-4 ring-base-800"
            style={{ background: KIND_COLOR[e.kind] }}
          />
          <div className="flex items-baseline justify-between gap-2">
            <span className={clsx("text-xs", e.kind === "escalation" ? "font-medium text-crit" : "text-slate-300")}>
              {e.label}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-slate-500">{fmtTime(e.t)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
