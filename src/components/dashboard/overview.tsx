"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

type OverviewProps = {
  data: {
    name: string;
    total: number;
  }[];
}

export default function Overview({ data }: OverviewProps) {

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(value as number)}`}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
