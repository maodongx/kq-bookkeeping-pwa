"use client";

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { Card } from "@heroui/react";

const ACCENT = "oklch(62.04% 0.1950 253.83)";

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
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 10000
                  ? `${(v / 10000).toFixed(0)}万`
                  : v.toLocaleString()
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
