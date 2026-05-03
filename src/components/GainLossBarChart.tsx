"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { GainLossItem } from "@/lib/chart-utils";

export function GainLossBarChart({
  data,
  currency,
}: {
  data: GainLossItem[];
  currency: Currency;
}) {
  if (data.length === 0) return null;

  const height = data.length * 50 + 40;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">投资盈亏</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 10000 || v <= -10000
                ? `${(v / 10000).toFixed(0)}万`
                : v.toLocaleString()
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const v = Number(value);
              const payload = item?.payload as GainLossItem | undefined;
              const pct = payload?.gainPct ?? 0;
              return [
                `${formatCurrency(v, currency)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`,
                "盈亏",
              ];
            }}
          />
          <Bar dataKey="gainLoss" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.gainLoss >= 0 ? "#dc2626" : "#16a34a"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
