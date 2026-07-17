"use client";

import { create } from "zustand";
import {
  addComment,
  advance,
  createInitial,
  manualReport,
  toggleChecklistItem,
} from "@/lib/simulation";
import type { IncidentType } from "@/lib/types";
import { makeRng } from "@/lib/rng";
import type { SimState } from "@/lib/types";

// Persistent RNG so hazard probabilities keep advancing across ticks.
const rng = makeRng(20260716 ^ 0x9e37);

interface SimStore extends SimState {
  started: boolean;
  lastReal: number;
  tick: () => void;
  start: () => void;
  setRunning: (r: boolean) => void;
  setSpeed: (s: number) => void;
  selectIncident: (id: string | null) => void;
  selectVehicle: (id: string | null) => void;
  toggleChecklist: (incidentId: string, itemId: string) => void;
  addComment: (incidentId: string, text: string) => void;
  manualReport: (routeId: string, tramoIdx: number, type: IncidentType) => void;
  markAlertsRead: () => void;
  reset: () => void;
}

export const useSimulation = create<SimStore>((set, get) => ({
  ...createInitial(),
  started: false,
  lastReal: Date.now(),

  start: () => {
    if (get().started) return;
    set({ started: true, lastReal: Date.now() });
  },

  tick: () => {
    const s = get();
    const nowReal = Date.now();
    // clamp real delta so a backgrounded tab does not fast-forward wildly
    const realDt = Math.min(4000, nowReal - s.lastReal);
    const next = advance(s as SimState, realDt, rng);
    set({ ...next, lastReal: nowReal });
  },

  setRunning: (r) => set({ running: r, lastReal: Date.now() }),
  setSpeed: (speed) => set({ speed }),
  selectIncident: (id) => set({ selectedIncidentId: id }),
  selectVehicle: (id) => set({ selectedVehicleId: id }),

  toggleChecklist: (incidentId, itemId) =>
    set((s) => toggleChecklistItem(s as SimState, incidentId, itemId) as Partial<SimStore>),

  addComment: (incidentId, text) =>
    set((s) => addComment(s as SimState, incidentId, text) as Partial<SimStore>),

  manualReport: (routeId, tramoIdx, type) =>
    set((s) => {
      const { state, incidentId } = manualReport(s as SimState, routeId, tramoIdx, type, rng);
      return { ...state, selectedIncidentId: incidentId, selectedVehicleId: null } as Partial<SimStore>;
    }),

  markAlertsRead: () =>
    set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),

  reset: () => set({ ...createInitial(Math.floor(Math.random() * 1e9)), started: true, lastReal: Date.now() }),
}));
