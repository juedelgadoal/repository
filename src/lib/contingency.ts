import { CHECKLIST_TEMPLATE } from "./domain";
import type { ChecklistItem } from "./types";

export function buildChecklist(): ChecklistItem[] {
  return CHECKLIST_TEMPLATE.map((t) => ({
    id: t.id,
    label: t.label,
    done: false,
    auto: t.auto,
    doneAt: null,
    by: null,
  }));
}

export const AGENTS = [
  "C. Torres · Analista CT",
  "M. Rincón · Coordinador",
  "L. Gómez · Seguridad",
  "A. Peña · Operaciones",
];

export function checklistCompletion(items: ChecklistItem[]): number {
  if (!items.length) return 0;
  return (items.filter((i) => i.done).length / items.length) * 100;
}
