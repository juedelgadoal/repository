"use client";

import { useState } from "react";
import { FileText, Image, Mail, MessageSquare, Phone, Send } from "lucide-react";
import type { CommKind, Incident } from "@/lib/types";
import { useSimulation } from "@/store/useSimulation";
import { fmtTime } from "@/lib/format";

const KIND_UI: Record<CommKind, { icon: any; color: string; label: string }> = {
  llamada: { icon: Phone, color: "#22c55e", label: "Llamada" },
  correo: { icon: Mail, color: "#3b82f6", label: "Correo" },
  comentario: { icon: MessageSquare, color: "#22d3ee", label: "Comentario" },
  archivo: { icon: FileText, color: "#a855f7", label: "Archivo" },
  foto: { icon: Image, color: "#f59e0b", label: "Fotografía" },
};

export function CommsLog({ inc }: { inc: Incident }) {
  const addComment = useSimulation((s) => s.addComment);
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    addComment(inc.id, text.trim());
    setText("");
  };

  const entries = [...inc.comms].sort((a, b) => b.t - a.t);

  return (
    <div className="flex flex-col">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Registrar comentario…"
          className="flex-1 rounded-lg border border-line bg-base-700/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand/50 focus:outline-none"
        />
        <button onClick={submit} className="btn-primary px-3">
          <Send size={14} />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {entries.map((c) => {
          const ui = KIND_UI[c.kind];
          const Icon = ui.icon;
          return (
            <div key={c.id} className="flex gap-2.5 rounded-lg border border-line bg-base-700/40 p-2.5">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: ui.color + "1f", color: ui.color }}
              >
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">{c.from}</span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">{fmtTime(c.t)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{c.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
