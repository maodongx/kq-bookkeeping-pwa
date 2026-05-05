"use client";

import { Card } from "@heroui/react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SpendingTransaction } from "@/lib/bookkeeping-types";

interface SpendingLineChartProps {
  transactions: SpendingTransaction[];
  /** Inclusive YYYY-MM-DD bounds (month start/end in user local time). */
  startDate: string;
  endDate: string;
}

/**
 * Bucket transactions by day within [startDate, endDate] and emit one
 * point per day (zero-filled). All date math stays in `YYYY-MM-DD`
 * string space to avoid timezone drift — iterating with a local-time
 * Date but extracting via the helper keeps the two sides consistent
 * with the rest of the app's date convention.
 */
function groupByDay(
  transactions: SpendingTransaction[],
  startDate: string,
  endDate: string
): Array<{ date: string; spending: number }> {
  const dailyTotals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.date >= startDate && tx.date <= endDate) {
      dailyTotals.set(
        tx.date,
        (dailyTotals.get(tx.date) ?? 0) + tx.amount
      );
    }
  }

  // Iterate day-by-day in local time. Parsing "YYYY-MM-DD" with new Date()
  // treats it as UTC midnight; we reconstruct via getUTC* to stay stable
  // across DST changes while iterating.
  const result: Array<{ date: string; spending: number }> = [];
  const [startY, startM, startD] = startDate.split("-").map(Number);
  const [endY, endM, endD] = endDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(startY, startM - 1, startD));
  const last = new Date(Date.UTC(endY, endM - 1, endD));

  while (cursor <= last) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cursor.getUTCDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    result.push({ date: key, spending: dailyTotals.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export function SpendingLineChart({
  transactions,
  startDate,
  endDate,
}: SpendingLineChartProps) {
  const data = groupByDay(transactions, startDate, endDate);

  if (data.length < 2) {
    return (
      <Card>
        <Card.Content>
          <p className="py-4 text-center text-sm text-muted">
            需要更多数据来绘制趋势
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>每日支出</Card.Title>
      </Card.Header>
      <Card.Content>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(d: string) =>
                `${parseInt(d.slice(5, 7))}/${parseInt(d.slice(8))}`
              }
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v.toLocaleString()
              }
              width={45}
            />
            <Tooltip
              formatter={(value) => [
                `¥${Number(value).toLocaleString()}`,
                "支出",
              ]}
              labelFormatter={(label) => String(label)}
            />
            <Line
              type="monotone"
              dataKey="spending"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card.Content>
    </Card>
  );
}
