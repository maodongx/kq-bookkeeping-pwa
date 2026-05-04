"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Currency,
  AssetCategory,
  AssetTag,
  RiskLevel,
  Asset,
  Transaction,
  AssetPriceSnapshot,
  ExchangeRateSnapshot,
} from "@/lib/types";
import { formatCurrency, RISK_LABELS } from "@/lib/currency";
import { RateMap, convertCurrency, totalNetWorth } from "@/lib/exchange-rates";
import { computeNetWorthTimeSeries } from "@/lib/chart-utils";
import { refreshAllPrices } from "@/lib/prices";
import { cn } from "@/lib/utils";
import { Card } from "@heroui/react";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { AllocationPieChart } from "./AllocationPieChart";
import { RefreshPricesButton } from "./RefreshPricesButton";

/**
 * Fixed color mapping for the risk-level pie chart so the visual meaning
 * stays stable regardless of slice ordering or which risk buckets exist
 * in the portfolio on a given day.
 *   低风险 => green  (safe)
 *   中风险 => yellow (moderate)
 *   高风险 => red    (risky)
 * Assets without a risk level get the default palette via "未分类".
 */
const RISK_COLORS: Record<string, string> = {
  低风险: "#10b981", // emerald-500
  中风险: "#f59e0b", // amber-500
  高风险: "#ef4444", // red-500
};

export interface EnrichedAsset {
  id: string;
  name: string;
  category: AssetCategory;
  currency: Currency;
  symbol: string | null;
  tag: AssetTag | null;
  riskLevel: RiskLevel | null;
  marketValue: number;
  totalCost: number;
  gainLoss: number;
  gainPct: number;
}

export function DashboardClient({
  assets,
  rawAssets,
  transactions,
  priceSnapshots,
  rateSnapshots,
  rates,
  defaultCurrency,
  lastUpdate,
}: {
  assets: EnrichedAsset[];
  rawAssets: Asset[];
  transactions: Transaction[];
  priceSnapshots: AssetPriceSnapshot[];
  rateSnapshots: ExchangeRateSnapshot[];
  rates: RateMap;
  defaultCurrency: Currency;
  lastUpdate: string | null;
}) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const router = useRouter();
  const hasRefreshed = useRef(false);

  useEffect(() => {
    if (hasRefreshed.current) return;
    hasRefreshed.current = true;
    refreshAllPrices().then(() => router.refresh());
  }, [router]);

  // Net worth: sum of each asset's marketValue converted from its native
  // currency into the currently-selected display currency.
  const netWorth = totalNetWorth(assets, currency, rates);

  // Total cost: sum of each asset's cost basis converted into the currently-
  // selected currency. Using the latest rates is an accepted simplification —
  // showing gain/loss at "today's rate" for both sides keeps the comparison
  // self-consistent when the user flips between currencies.
  const totalCost = useMemo(
    () =>
      assets.reduce(
        (sum, a) => sum + convertCurrency(a.totalCost, a.currency, currency, rates),
        0
      ),
    [assets, currency, rates]
  );

  const totalGain = netWorth - totalCost;

  // Historical net worth series in the SELECTED currency. Recomputed on
  // every currency switch using the historical rate snapshots so the "近1月"
  // and "年化" percentages stay meaningful across currency switches.
  const allTimeSeries = useMemo(
    () =>
      computeNetWorthTimeSeries(
        rawAssets,
        transactions,
        priceSnapshots,
        rateSnapshots,
        currency,
        "ALL"
      ),
    [rawAssets, transactions, priceSnapshots, rateSnapshots, currency]
  );

  const oneMonthSeries = useMemo(
    () =>
      computeNetWorthTimeSeries(
        rawAssets,
        transactions,
        priceSnapshots,
        rateSnapshots,
        currency,
        "1M"
      ),
    [rawAssets, transactions, priceSnapshots, rateSnapshots, currency]
  );

  const firstPoint = allTimeSeries[0] ?? null;
  const oneMonthAgoPoint = oneMonthSeries[0] ?? null;

  const firstSnapshotDate = firstPoint?.date ?? null;
  const firstSnapshotNetWorth = firstPoint?.netWorth ?? null;
  const oneMonthAgoNetWorth = oneMonthAgoPoint?.netWorth ?? null;

  const monthChange =
    oneMonthAgoNetWorth != null ? netWorth - oneMonthAgoNetWorth : null;
  const monthChangePct =
    oneMonthAgoNetWorth && oneMonthAgoNetWorth > 0
      ? (monthChange! / oneMonthAgoNetWorth) * 100
      : null;

  let annualizedPct: number | null = null;
  if (firstSnapshotDate && firstSnapshotNetWorth && firstSnapshotNetWorth > 0) {
    const days =
      (Date.now() - new Date(firstSnapshotDate).getTime()) / 86400000;
    if (days >= 30) {
      const totalReturn = netWorth / firstSnapshotNetWorth;
      annualizedPct = (Math.pow(totalReturn, 365 / days) - 1) * 100;
    }
  }

  const byTag = Object.entries(
    assets.reduce(
      (acc, a) => {
        const label = a.tag || "未分类";
        acc[label] =
          (acc[label] || 0) +
          convertCurrency(a.marketValue, a.currency, currency, rates);
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, value]) => ({ name, value }));

  const byRisk = Object.entries(
    assets.reduce(
      (acc, a) => {
        const label = a.riskLevel ? RISK_LABELS[a.riskLevel] : "未分类";
        acc[label] =
          (acc[label] || 0) +
          convertCurrency(a.marketValue, a.currency, currency, rates);
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">总览</h1>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted">
              {new Date(lastUpdate).toLocaleString("zh-CN", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <RefreshPricesButton />
        </div>
      </div>

      <div className="flex justify-center">
        <CurrencySwitcher value={currency} onChange={setCurrency} />
      </div>

      {assets.length > 0 ? (
        <Card className="py-2 text-center">
          <Card.Content>
            <p className="text-sm text-muted">总资产</p>
            <p className="text-3xl font-bold tabular-nums">
              {formatCurrency(netWorth, currency)}
            </p>
          </Card.Content>
        </Card>
      ) : (
        <Card className="py-4 text-center">
          <Card.Content>
            <p className="mb-2 text-4xl">📭</p>
            <p className="text-muted">暂无资产，前往「资产」页面添加</p>
          </Card.Content>
        </Card>
      )}

      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="py-1 text-center">
            <Card.Content>
              <p className="text-xs text-muted">累计盈亏</p>
              <p className={cn(
                "text-sm font-semibold tabular-nums",
                totalGain >= 0 ? "text-red-600" : "text-green-600"
              )}>
                {formatCurrency(totalGain, currency)}
              </p>
            </Card.Content>
          </Card>
          <Card className="py-1 text-center">
            <Card.Content>
              <p className="text-xs text-muted">近1月</p>
              <p className={cn(
                "text-sm font-semibold tabular-nums",
                monthChangePct != null && monthChangePct >= 0 ? "text-red-600" : "text-green-600"
              )}>
                {monthChangePct != null
                  ? `${monthChangePct >= 0 ? "+" : ""}${monthChangePct.toFixed(2)}%`
                  : "—"}
              </p>
            </Card.Content>
          </Card>
          <Card className="py-1 text-center">
            <Card.Content>
              <p className="text-xs text-muted">年化</p>
              <p className={cn(
                "text-sm font-semibold tabular-nums",
                annualizedPct != null && annualizedPct >= 0 ? "text-red-600" : "text-green-600"
              )}>
                {annualizedPct != null
                  ? `${annualizedPct >= 0 ? "+" : ""}${annualizedPct.toFixed(2)}%`
                  : "—"}
              </p>
            </Card.Content>
          </Card>
        </div>
      )}

      <AllocationPieChart data={byTag} title="按标签分配" />
      <AllocationPieChart
        data={byRisk}
        title="按风险等级分配"
        colorMap={RISK_COLORS}
      />
    </div>
  );
}
