"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

type ModeratorStatsChartProps = {
  data: Array<{ name: string; value: number }>;
};

export default function ModeratorStatsChart({ data }: ModeratorStatsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} tickLine={false} />
        <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} />
        <Tooltip contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", color: "#fff" }} />
        <Bar dataKey="value" fill="var(--fv-clay, #d97706)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
