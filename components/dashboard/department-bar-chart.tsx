"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DepartmentSlice } from "@/lib/frappe/queries";

const PURPLE = "#312E81"; // deep ink purple matches mockup bars

export function DepartmentBarChart({ data }: { data: DepartmentSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-ash-500">
        No department data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 18, right: 4, bottom: 4, left: 4 }}>
        <XAxis
          dataKey="department"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#6B7280", fontSize: 11 }}
          interval={0}
          angle={data.length > 4 ? -18 : 0}
          height={48}
          textAnchor={data.length > 4 ? "end" : "middle"}
        />
        <YAxis hide domain={[0, "dataMax + 10"]} />
        <Tooltip
          cursor={{ fill: "rgba(49, 46, 129, 0.06)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E6E8EE",
            fontSize: 12,
          }}
          formatter={(v: number) => [`${v}%`, "Share"]}
        />
        <Bar dataKey="percentage" radius={[8, 8, 4, 4]} maxBarSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={PURPLE} />
          ))}
          <LabelList
            dataKey="percentage"
            position="top"
            formatter={(v: number) => `${v}%`}
            style={{ fill: "#1E1B53", fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
