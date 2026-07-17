"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fontSize: 11, fill: "#64748b" };
const GRID = "#1e293b";
const PALETTE = ["#22d3ee", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#22c55e", "#eab308", "#38bdf8", "#94a3b8", "#f97316"];

const tooltipStyle = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export function HBar({ data, color = "#22d3ee" }: { data: { name: string; value: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={AXIS} width={130} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={color} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VBar({ data }: { data: { hour: string; count: number; crit: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="hour" tick={{ ...AXIS, fontSize: 9 }} interval={1} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey="count" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Incidentes" barSize={12} />
        <Bar dataKey="crit" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} name="Alta/Crítica" barSize={12} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Trend({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis dataKey="t" tick={{ ...AXIS, fontSize: 9 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[60, 100]} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="sla" stroke="#22c55e" strokeWidth={2} dot={false} name="SLA %" />
        <Line type="monotone" dataKey="otif" stroke="#22d3ee" strokeWidth={2} dot={false} name="OTIF %" />
        <Line type="monotone" dataKey="contingencia" stroke="#a855f7" strokeWidth={2} dot={false} name="Plan %" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CostTrend({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis dataKey="t" tick={{ ...AXIS, fontSize: 9 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `$${v} M`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="costo" stroke="#ef4444" strokeWidth={2} dot={false} name="Costo generado (M)" />
        <Line type="monotone" dataKey="evitado" stroke="#22c55e" strokeWidth={2} dot={false} name="Costo evitado (M)" />
      </LineChart>
    </ResponsiveContainer>
  );
}
