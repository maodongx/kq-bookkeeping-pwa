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

/**
 * Render percentage labels INSIDE each slice. We intentionally skip labels
 * for very small slices (<5%) because the text would overlap neighbors,
 * and skip labels completely on narrow slices where they would be clipped.
 *
 * Labels are placed inside (not outside) the slice so they never extend
 * past the SVG viewport — this fixes the trimmed text on iPhone 14/15 Pro
 * (~390px viewport) where outside labels were getting cut off at the edge.
 */
interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function renderInsideLabel(props: PieLabelProps) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent = 0,
  } = props;

  // Don't render a label for slices smaller than 5% — too crowded.
  if (percent < 0.05) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[11px] font-medium"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
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
        <div className="w-full">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={filtered}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                label={renderInsideLabel}
                labelLine={false}
                isAnimationActive={false}
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
                iconSize={10}
                formatter={(value: string) => (
                  <span className="text-xs text-muted">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card.Content>
    </Card>
  );
}
