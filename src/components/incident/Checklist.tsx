"use client";

import { Check, CircleDot, Zap } from "lucide-react";
import type { Incident } from "@/lib/types";
import { useSimulation } from "@/store/useSimulation";
import { checklistCompletion } from "@/lib/contingency";
import { fmtTime } from "@/lib/format";
import { Progress } from "@/components/ui/primitives";
import clsx from "clsx";

export function Checklist({ inc }: { inc: Incident }) {
  const toggle = useSimulation((s) => s.toggleChecklist);
  const completion = checklistCompletion(inc.checklist);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-slate-400">Progreso del plan</span>
        <span className="font-mono text-xs text-brand">{completion.toFixed(0)}%</span>
      </div>
      <Progress value={completion} color="#22d3ee" />
      <div className="mt-3 space-y-1.5">
        {inc.checklist.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(inc.id, item.id)}
            className={clsx(
              "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
              item.done
                ? "border-ok/30 bg-ok/10"
                : "border-line bg-base-700/40 hover:bg-base-600/50"
            )}
          >
            <span
              className={clsx(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                item.done ? "border-ok bg-ok/20 text-ok" : "border-slate-600 text-transparent"
              )}
            >
              <Check size={13} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={clsx("block text-sm", item.done ? "text-slate-300 line-through" : "text-slate-200")}>
                {item.label}
              </span>
              {item.done && item.by && (
                <span className="text-[10px] text-slate-500">
                  {item.by} · {item.doneAt ? fmtTime(item.doneAt) : ""}
                </span>
              )}
            </span>
            {item.auto && (
              <span className="flex shrink-0 items-center gap-1 text-[9px] uppercase tracking-wide text-slate-500">
                <Zap size={10} /> auto
              </span>
            )}
            {!item.done && !item.auto && <CircleDot size={13} className="shrink-0 text-slate-600" />}
          </button>
        ))}
      </div>
    </div>
  );
}
