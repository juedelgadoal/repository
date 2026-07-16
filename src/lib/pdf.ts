import { jsPDF } from "jspdf";
import type { ReportData } from "./report";
import { copShort, fmtMin, pct } from "./format";
import { INCIDENT_TYPES } from "./domain";

// Generates a simulated executive PDF report from the live operation state.
export function generateReportPdf(r: ReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 0;

  const ink = "#0f172a";
  const brand: [number, number, number] = [15, 118, 110];

  const stamp = new Date(r.generatedAt).toLocaleString("es-CO");

  const ensure = (h: number) => {
    if (y + h > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = M;
    }
  };

  const heading = (t: string) => {
    ensure(30);
    y += 14;
    doc.setFillColor(...brand);
    doc.rect(M, y - 10, 4, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(ink);
    doc.text(t, M + 12, y + 3);
    y += 16;
    doc.setDrawColor(220);
    doc.line(M, y, W - M, y);
    y += 8;
  };

  const para = (t: string, indent = 0) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(t, W - 2 * M - indent);
    for (const line of lines) {
      ensure(14);
      doc.text(line, M + indent, y);
      y += 14;
    }
  };

  const bullet = (t: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(t, W - 2 * M - 16);
    ensure(14);
    doc.setTextColor(...brand);
    doc.text("•", M + 4, y);
    doc.setTextColor(60);
    doc.text(lines[0], M + 16, y);
    y += 14;
    for (let i = 1; i < lines.length; i++) {
      ensure(14);
      doc.text(lines[i], M + 16, y);
      y += 14;
    }
  };

  // Cover header
  doc.setFillColor(11, 17, 32);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor("#22d3ee");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Reporte Ejecutivo · Control Tower", M, 42);
  doc.setTextColor("#e2e8f0");
  doc.setFontSize(11);
  doc.text("Gestión de Contingencias Logísticas — operación simulada", M, 62);
  doc.setFontSize(9);
  doc.setTextColor("#94a3b8");
  doc.text(`Generado: ${stamp}  ·  Datos simulados (no reales)`, M, 78);
  y = 110;

  // KPIs table
  heading("1. Resumen de la operación · KPIs");
  const kpis: [string, string][] = [
    ["Cumplimiento SLA", pct(r.kpis.slaCompliance)],
    ["OTIF", pct(r.kpis.otif)],
    ["Cumplimiento Plan de Contingencia", pct(r.kpis.contingencyCompliance)],
    ["Costo generado", copShort(r.kpis.costGeneratedCop)],
    ["Costo evitado", copShort(r.kpis.costAvoidedCop)],
    ["Tiempo promedio de reacción", fmtMin(r.kpis.avgReactionMin)],
    ["Tiempo promedio de resolución", fmtMin(r.kpis.avgResolutionMin)],
    ["Vehículos activos", String(r.kpis.activeVehicles)],
    ["Incidentes abiertos", String(r.kpis.openIncidents)],
    ["Incidentes críticos", String(r.kpis.criticalIncidents)],
  ];
  const colW = (W - 2 * M) / 2;
  kpis.forEach((row, i) => {
    const col = i % 2;
    if (col === 0) ensure(22);
    const x = M + col * colW;
    doc.setDrawColor(230);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y - 11, colW - 8, 20, 3, 3, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(row[0], x + 8, y - 1);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(ink);
    doc.text(row[1], x + colW - 16, y - 1, { align: "right" });
    if (col === 1) y += 24;
  });
  if (kpis.length % 2 === 1) y += 24;

  // Incidents summary
  heading("2. Incidentes");
  para(`Total de incidentes gestionados: ${r.a.total}. Resueltos: ${r.a.resolvedCount}.`);
  para("Distribución por tipo:");
  r.a.byType
    .sort((a, b) => b.value - a.value)
    .forEach((t) => bullet(`${t.name}: ${t.value}`));
  if (r.topRoute) para(`Ruta con mayor incidencia: ${r.topRoute.name} (${r.topRoute.value}).`);

  // Costs
  heading("3. Costos");
  para(`Costo total generado por incidentes: ${r.costGeneratedFull}.`);
  para(`Costo evitado por la gestión de contingencias: ${r.costAvoidedFull}.`);

  // Affected clients
  heading("4. Clientes afectados");
  if (r.clientList.length === 0) para("Ningún cliente con afectación en la ventana analizada.");
  r.clientList.forEach((c) => bullet(`${c.name} — línea ${c.line}${c.critical ? " (crítico)" : ""}`));

  // SLA & contingency
  heading("5. Cumplimiento SLA y Plan de Contingencia");
  para(`Cumplimiento SLA: ${pct(r.kpis.slaCompliance)} · OTIF: ${pct(r.kpis.otif)}.`);
  para(`Cumplimiento del Plan de Contingencia (checklist): ${pct(r.kpis.contingencyCompliance)}.`);

  // Conclusions
  heading("6. Conclusiones automáticas");
  r.conclusions.forEach(bullet);

  // Recommendations
  heading("7. Recomendaciones");
  r.recommendations.forEach(bullet);

  // Footer on all pages
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Control Tower Inteligente · MVP · Información simulada — no utilizar como dato operacional real.",
      M,
      doc.internal.pageSize.getHeight() - 24
    );
    doc.text(`${p} / ${pages}`, W - M, doc.internal.pageSize.getHeight() - 24, { align: "right" });
  }

  doc.save(`Reporte_Ejecutivo_ControlTower_${new Date(r.generatedAt).toISOString().slice(0, 16).replace(/[:T]/g, "")}.pdf`);
}
