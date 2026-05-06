"use client";

import { Card } from "@heroui/react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/currency";
import { convertCurrency, type RateMap } from "@/lib/exchange-rates";
import type { Currency } from "@/lib/types";
import type { SpendingTransaction } from "@/lib/bookkeeping-types";

type Granularity = "day" | "month";

interface SpendingLineChartProps {
  transactions: SpendingTransaction[];
  /** Inclusive YYYY-MM-DD bounds (month start/end or year start/end). */
  startDate: string;
  endDate: string;
  /** User's default currency — the chart's Y axis is expressed in this. */
  displayCurrency: Currency;
  /** Rate snapshot for the per-row currency conversion. */
  rates: RateMap;
  /**
   * "day" (default): one point per day over the range — for monthly view.
   * "month": one point per month — for annual view, where 365 daily ticks
   *   would be unreadable on mobile.
   */
  granularity?: Granularity;
  /** Card title — defaults to "每日支出" for day / "每月支出" for month. */
  title?: string;
  /**
   * Optional subheader shown under the title (e.g. "总支出 ¥123,456").
   * When provided, the caller owns the formatting. Hidden when undefined.
   */
  subheader?: string;
}

/**
 * Bucket transactions by `granularity` within [startDate, endDate] and
 * emit one point per bucket (zero-filled). Each transaction's amount is
 * converted from its own stored currency into `displayCurrency` before
 * summing, so a JPY + CNY + USD mix plots correctly on one axis.
 *
 * All date math stays in `YYYY-MM-DD` string space to avoid timezone
 * drift. Daily buckets use UTC-based iteration; monthly buckets just
 * slice the date string.
 */
function groupData(
  transactions: SpendingTransaction[],
  startDate: string,
  endDate: string,
  displayCurrency: Currency,
  rates: RateMap,
  granularity: Granularity
): Array<{ date: string; spending: number }> {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.date < startDate || tx.date > endDate) continue;
    const converted = convertCurrency(
      tx.amount,
      tx.currency,
      displayCurrency,
      rates
    );
    const key =
      granularity === "month" ? tx.date.slice(0, 7) : tx.date;
    totals.set(key, (totals.get(key) ?? 0) + converted);
  }

  const result: Array<{ date: string; spending: number }> = [];
  const [startY, startM, startD] = startDate.split("-").map(Number);
  const [endY, endM, endD] = endDate.split("-").map(Number);

  if (granularity === "month") {
    let y = startY;
    let m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      result.push({ date: key, spending: totals.get(key) ?? 0 });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return result;
  }

  // Daily
  const cursor = new Date(Date.UTC(startY, startM - 1, startD));
  const last = new Date(Date.UTC(endY, endM - 1, endD));
  while (cursor <= last) {
    const y = cursor.getUTCFullYear();
    const mo = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cursor.getUTCDate()).padStart(2, "0");
    const key = `${y}-${mo}-${d}`;
    result.push({ date: key, spending: totals.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export function SpendingLineChart({
  transactions,
  startDate,
  endDate,
  displayCurrency,
  rates,
  granularity = "day",
  title,
  subheader,
}: SpendingLineChartProps) {
  const data = groupData(
    transactions,
    startDate,
    endDate,
    displayCurrency,
    rates,
    granularity
  );

  const resolvedTitle =
    title ?? (granularity === "month" ? "每月支出" : "每日支出");

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

  const tickFormatter =
    granularity === "month"
      ? (d: string) => `${parseInt(d.slice(5, 7))}月`
      : (d: string) =>
          `${parseInt(d.slice(5, 7))}/${parseInt(d.slice(8))}`;

  return (
    <Card>
      <Card.Header>
        <Card.Title>{resolvedTitle}</Card.Title>
        {subheader && (
          <p className="text-xs text-muted tabular-nums">{subheader}</p>
        )}
      </Card.Header>
      <Card.Content>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={tickFormatter}
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
                formatCurrency(Number(value), displayCurrency),
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
