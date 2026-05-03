"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@heroui/react";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

interface Slice {
  name: string;
  value: number;
}

export function AllocationPieChart({
  data,
  title,
}: {
  data: Slice[];
  title: string;
}) {
  const filtered = data.filter((d) => d.value > 0);

  if (filtered.length === 0) return null;

  return (
    <Card>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Content>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {filtered.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                Number(value).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              }
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-muted">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card.Content>
    </Card>
  );
}
