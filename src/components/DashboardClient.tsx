"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Asset,
  AssetPriceSnapshot,
  Currency,
  ExchangeRateSnapshot,
  Transaction,
} from "@/lib/types";
import { formatCurrency, RISK_COLORS, gainLossTextClass } from "@/lib/currency";
import { RateMap } from "@/lib/exchange-rates";
import { refreshAllPrices } from "@/lib/prices";
import {
  DashboardAsset,
  computeDashboardStats,
} from "@/lib/dashboard-stats";
import { Card } from "@heroui/react";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { AllocationPieChart } from "./AllocationPieChart";
import { RefreshPricesButton } from "./RefreshPricesButton";
import { StatCard } from "./StatCard";

export type { DashboardAsset } from "@/lib/dashboard-stats";

/** "+3.21%", "-1.05%", or "—" when the percentage is not available. */
function fmtPct(pct: number | null): string {
  if (pct == null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
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
  assets: DashboardAsset[];
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

  // Refresh prices once per mount. The ref guards against React strict
  // mode's double-invoke in dev, which would otherwise hit the external
  // price and rate APIs twice on every reload.
  const hasRefreshed = useRef(false);
  useEffect(() => {
    if (hasRefreshed.current) return;
    hasRefreshed.current = true;
    refreshAllPrices().then(() => router.refresh());
  }, [router]);

  const stats = useMemo(
    () =>
      computeDashboardStats({
        assets,
        rawAssets,
        transactions,
        priceSnapshots,
        rateSnapshots,
        rates,
        currency,
      }),
    [assets, rawAssets, transactions, priceSnapshots, rateSnapshots, rates, currency]
  );

  const hasAssets = assets.length > 0;

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

      {hasAssets ? (
        <Card className="py-2 text-center">
          <Card.Content>
            <p className="text-sm text-muted">总资产</p>
            <p className="text-3xl font-bold tabular-nums">
              {formatCurrency(stats.netWorth, currency)}
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

      {hasAssets && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="累计盈亏"
            value={formatCurrency(stats.totalGain, currency)}
            tone={gainLossTextClass(stats.totalGain)}
          />
          <StatCard
            label="近1月"
            value={fmtPct(stats.monthChangePct)}
            tone={gainLossTextClass(stats.monthChangePct ?? 0)}
          />
          <StatCard
            label="年化"
            value={fmtPct(stats.annualizedPct)}
            tone={gainLossTextClass(stats.annualizedPct ?? 0)}
          />
        </div>
      )}

      <AllocationPieChart
        data={stats.byTag}
        title="按标签分配"
        currency={currency}
        centerLabel="总计"
      />
      <AllocationPieChart
        data={stats.byRisk}
        title="按风险等级分配"
        colorMap={RISK_COLORS}
        currency={currency}
        centerLabel="总计"
      />
    </div>
  );
}
