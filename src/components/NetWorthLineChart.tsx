"use client";

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";
import { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { Card } from "@heroui/react";

/**
 * Use the HeroUI theme's accent token so the line color follows light/dark
 * mode and any future re-theming. SVG attributes accept `var(...)` — we
 * verified this renders the stroke, fill, and the gradient stops correctly
 * in Recharts' AreaChart. No JS read of the computed value is needed.
 */
const ACCENT = "var(--accent)";

interface DataPoint {
  date: string;
  netWorth: number;
}

export function NetWorthLineChart({
  data,
  currency,
}: {
  data: DataPoint[];
  currency: Currency;
}) {
  if (data.length < 2) {
    return (
      <Card className="py-4 text-center text-sm">
        <Card.Content>
          <p className="text-muted">需要更多历史数据来绘制趋势</p>
        </Card.Content>
      </Card>
    );
  }

  // Net worth is a trend metric, not a magnitude comparison, so a zero-anchored
  // y-axis is wrong here: it squashes the real day-to-day movement into a flat
  // line at the top of the chart. Instead, frame the axis around the actual
  // value range with ~8% headroom on each side so the variation fills the plot.
  // Guard the degenerate flat-series case (min === max) with an absolute pad.
  const values = data.map((d) => d.netWorth);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = dataMax - dataMin;
  const pad = span > 0 ? span * 0.08 : Math.max(Math.abs(dataMax) * 0.05, 1);
  const yMin = dataMin - pad;
  const yMax = dataMax + pad;

  return (
    <Card>
      <Card.Header>
        <Card.Title>资产趋势</Card.Title>
      </Card.Header>
      <Card.Content>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.2} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(d: string) => {
                const [, m, day] = d.split("-");
                return `${parseInt(m)}/${parseInt(day)}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 10000
                  ? `${(v / 10000).toFixed(1)}万`
                  : Math.round(v).toLocaleString()
              }
              width={50}
            />
            <Tooltip
              formatter={(value) => [
                formatCurrency(Number(value), currency),
                "总资产",
              ]}
              labelFormatter={(label) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke={ACCENT}
              strokeWidth={2}
              fill="url(#netWorthGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card.Content>
    </Card>
  );
}
