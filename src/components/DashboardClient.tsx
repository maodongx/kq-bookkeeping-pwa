"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import type { Key } from "@heroui/react";
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
import {
  TimeRange,
  TIME_RANGE_LABELS,
  computeNetWorthTimeSeries,
} from "@/lib/chart-utils";
import { Card, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { AllocationPieChart } from "./AllocationPieChart";
import { StatCard } from "./StatCard";
import { NetWorthLineChart } from "./NetWorthLineChart";

const TIME_RANGES: TimeRange[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

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

/**
 * Persist the "hide 总资产" preference so the number stays hidden across
 * reloads — useful when the user is about to show their phone to
 * someone and doesn't want to re-toggle every time.
 */
const HIDE_WEALTH_STORAGE_KEY = "kq:hide-total-wealth";

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
  const [range, setRange] = useState<TimeRange>("3M");
  // `null` until the localStorage read completes, so we render "••••"
  // placeholder instead of briefly flashing the true value for users
  // who had it hidden.
  const [hideWealth, setHideWealth] = useState<boolean | null>(null);
  const router = useRouter();

  // Load the persisted hide preference on mount. The read touches an
  // external system (localStorage) so it has to live in an effect per
  // React Compiler's purity rules.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(HIDE_WEALTH_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHideWealth(stored === "1");
  }, []);

  const toggleHideWealth = useCallback(() => {
    setHideWealth((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          HIDE_WEALTH_STORAGE_KEY,
          next ? "1" : "0"
        );
      }
      return next;
    });
  }, []);

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

  const timeSeries = useMemo(
    () =>
      computeNetWorthTimeSeries(
        rawAssets,
        transactions,
        priceSnapshots,
        rateSnapshots,
        currency,
        range
      ),
    [rawAssets, transactions, priceSnapshots, rateSnapshots, currency, range]
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
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-muted">总资产</p>
              <button
                type="button"
                onClick={toggleHideWealth}
                className="text-muted transition-transform active:scale-95"
                aria-label={hideWealth ? "显示金额" : "隐藏金额"}
              >
                {hideWealth ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-3xl font-bold tabular-nums">
              {hideWealth === null || hideWealth
                ? "••••••"
                : formatCurrency(stats.netWorth, currency)}
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

      {/* Net worth line chart */}
      {hasAssets && (
        <>
          <div className="flex justify-center">
            <ToggleButtonGroup
              aria-label="时间范围"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={new Set<Key>([range])}
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (next) setRange(next as TimeRange);
              }}
            >
              {TIME_RANGES.map((r, i) => (
                <ToggleButton key={r} id={r}>
                  {i > 0 && <ToggleButtonGroup.Separator />}
                  {TIME_RANGE_LABELS[r]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
          <NetWorthLineChart data={timeSeries} currency={currency} />
        </>
      )}
    </>
  );
}
