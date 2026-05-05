"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";
import {
  DashboardAsset,
  computeDashboardStats,
} from "@/lib/dashboard-stats";
import { Card } from "@heroui/react";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { AllocationPieChart } from "./AllocationPieChart";
import { StatCard } from "./StatCard";

/** "+3.21%", "-1.05%", or "—" when the percentage is not available. */
function fmtPct(pct: number | null): string {
  if (pct == null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

/**
 * Auto-refresh throttle: once the user has kicked off an external price
 * fetch, don't fire it again until the cooldown elapses. Without this the
 * dashboard re-hits Yahoo / MUFG / Tiantian / open.er-api.com every time
 * the user tabs back to /, which caused a ~1-2s re-paint and made tab
 * navigation feel sluggish. The key lives in sessionStorage so the
 * throttle survives client-side route changes (including strict-mode
 * double-invokes in dev) but resets when the tab closes.
 */
const REFRESH_COOLDOWN_KEY = "kq:last-price-refresh";
const REFRESH_COOLDOWN_MS = 25 * 60 * 1000;

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const last = Number(
      window.sessionStorage.getItem(REFRESH_COOLDOWN_KEY) ?? 0
    );
    if (Date.now() - last < REFRESH_COOLDOWN_MS) return;
    // Set the timestamp before firing so strict-mode double-invokes and
    // rapid re-renders both see the cooldown and bail out.
    window.sessionStorage.setItem(REFRESH_COOLDOWN_KEY, String(Date.now()));
    refreshAllPrices().then(() => router.refresh());
  }, [router]);

  /**
   * Persist the tapped currency as the user's default. The dashboard's
   * currency toggle used to be display-only; the persistent version
   * lived on a dedicated settings page. Merging behaviors here means
   * one tap now both switches the display AND updates user_metadata,
   * so the choice sticks across devices on next load. Fire-and-forget
   * — if the write fails the user only loses the default on next
   * refresh, not the current view.
   */
  const handleCurrencyChange = useCallback((c: Currency) => {
    setCurrency(c);
    const supabase = createClient();
    supabase.auth.updateUser({ data: { default_currency: c } });
  }, []);

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
    <>
      {lastUpdate && (
        <p className="-mt-2 text-center text-xs text-muted">
          数据更新于{" "}
          {new Date(lastUpdate).toLocaleString("zh-CN", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      <div className="flex justify-center">
        <CurrencySwitcher value={currency} onChange={handleCurrencyChange} />
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
    </>
  );
}
