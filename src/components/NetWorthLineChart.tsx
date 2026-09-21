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
  // Reduce rather than `Math.min(...values)`: the ALL range grows one point per
  // snapshot day, and spreading a large array into a call blows the argument
  // limit. Nobody has 10 years of history yet, but the failure mode is a hard
  // crash of the whole dashboard, so it isn't worth leaving to chance.
  let dataMin = data[0].netWorth;
  let dataMax = data[0].netWorth;
  for (const d of data) {
    if (d.netWorth < dataMin) dataMin = d.netWorth;
    if (d.netWorth > dataMax) dataMax = d.netWorth;
  }
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
              // Threshold on the magnitude, not the signed value: `v >= 10000`
              // sent every negative tick down the plain-number branch, so a
              // -150,000 tick rendered as "-150,000" while +150,000 rendered as
              // "15.0万" on the same axis.
              tickFormatter={(v: number) =>
                Math.abs(v) >= 10000
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
