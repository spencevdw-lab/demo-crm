"use client";

import { useEffect, useState } from "react";
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

const STATUS_COLORS: Record<string, string> = {
  LEAD: "#94a3b8",
  QUALIFIED: "#f59e0b",
  CUSTOMER: "#10b981",
  CHURNED: "#ef4444",
};

const SECTOR_COLORS = [
  "#3b62ff", "#10b981", "#f59e0b", "#6366f1",
  "#ef4444", "#0ea5e9", "#8b5cf6", "#ec4899",
];

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export default function AnalyticsCharts({
  statusData,
  monthlyContacts,
  sectorData,
}: {
  statusData: { name: string; value: number }[];
  monthlyContacts: { month: string; contacts: number }[];
  sectorData: { sector: string; count: number }[];
}) {
  const isDark = useIsDark();
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const tooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
    background: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
    fontSize: 12,
  } as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      {/* Contacts by Status — donut */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Contacts by Status
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: tickColor }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* New contacts over time — line */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
          New Contacts (Last 6 Months)
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyContacts}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="contacts"
                stroke="#3b62ff"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#3b62ff" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Contacts by Sector — horizontal bar */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Contacts by Sector
        </h2>
        <div className="h-64">
          {sectorData.length === 0 || (sectorData.length === 1 && sectorData[0].sector === "Unclassified") ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              Add sectors to contacts to see breakdown
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fontSize: 11, fill: tickColor }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="sector"
                  tick={{ fontSize: 10, fill: tickColor }}
                  width={90}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {sectorData.map((_, i) => (
                    <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
