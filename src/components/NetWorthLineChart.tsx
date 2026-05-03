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
      <div className="bg-white rounded-xl p-6 shadow-sm text-center text-gray-400 text-sm">
        需要更多历史数据来绘制趋势
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">资产趋势</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#netWorthGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
