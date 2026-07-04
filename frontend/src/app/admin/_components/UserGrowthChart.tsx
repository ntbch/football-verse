"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type UserGrowthChartProps = {
  data: Array<{ date: string; count: number }>;
};

export default function UserGrowthChart({ data }: UserGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="date" stroke="#a3a3a3" fontSize={12} tickLine={false} />
        <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", color: "#fff" }} />
        <Line type="monotone" dataKey="count" stroke="var(--fv-grass, #10b981)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
