"use client";

import { useState } from "react";
import { Currency, AssetCategory } from "@/lib/types";
import { formatCurrency, CATEGORY_LABELS, isInvestment } from "@/lib/currency";
import { RateMap, convertCurrency, totalNetWorth } from "@/lib/exchange-rates";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { AllocationPieChart } from "./AllocationPieChart";
import { RefreshPricesButton } from "./RefreshPricesButton";

export interface EnrichedAsset {
  id: string;
  name: string;
  category: AssetCategory;
  currency: Currency;
  symbol: string | null;
  marketValue: number;
  totalCost: number;
  gainLoss: number;
  gainPct: number;
}

export function DashboardClient({
  assets,
  rates,
  defaultCurrency,
  lastUpdate,
}: {
  assets: EnrichedAsset[];
  rates: RateMap;
  defaultCurrency: Currency;
  lastUpdate: string | null;
}) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);

  const netWorth = totalNetWorth(assets, currency, rates);
  const investments = assets.filter((a) => isInvestment(a.category));

  const byCategory = Object.entries(
    assets.reduce(
      (acc, a) => {
        const label = CATEGORY_LABELS[a.category];
        acc[label] =
          (acc[label] || 0) +
          convertCurrency(a.marketValue, a.currency, currency, rates);
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, value]) => ({ name, value }));

  const byCurrency = Object.entries(
    assets.reduce(
      (acc, a) => {
        acc[a.currency] =
          (acc[a.currency] || 0) +
          convertCurrency(a.marketValue, a.currency, currency, rates);
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">总览</h1>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-gray-400">
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

      {/* Currency Switcher */}
      <div className="flex justify-center">
        <CurrencySwitcher value={currency} onChange={setCurrency} />
      </div>

      {/* Total Net Worth */}
      {assets.length > 0 ? (
        <div className="bg-white rounded-xl p-5 shadow-sm text-center">
          <p className="text-sm text-gray-500 mb-1">总资产</p>
          <p className="text-3xl font-bold tabular-nums">
            {formatCurrency(netWorth, currency)}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p>暂无资产，前往「资产」页面添加</p>
        </div>
      )}

      {/* Per-Currency Breakdown */}
      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {(["USD", "JPY", "CNY"] as Currency[]).map((c) => {
            const total = assets
              .filter((a) => a.currency === c)
              .reduce(
                (sum, a) =>
                  sum +
                  convertCurrency(a.marketValue, a.currency, currency, rates),
                0
              );
            if (total === 0) return null;
            return (
              <div
                key={c}
                className="bg-white rounded-xl p-3 shadow-sm text-center"
              >
                <p className="text-xs text-gray-400">{c}</p>
                <p className="text-sm font-semibold tabular-nums mt-0.5">
                  {formatCurrency(total, currency)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Investment Gain/Loss Summary */}
      {investments.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-sm mb-3">投资盈亏</h2>
          <div className="space-y-2">
            {investments.map((a) => {
              const converted = convertCurrency(
                a.marketValue,
                a.currency,
                currency,
                rates
              );
              const convertedGain = convertCurrency(
                a.gainLoss,
                a.currency,
                currency,
                rates
              );
              return (
                <div key={a.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-gray-400">
                      {CATEGORY_LABELS[a.category]}
                      {a.symbol ? ` · ${a.symbol}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums">
                      {formatCurrency(converted, currency)}
                    </p>
                    <p
                      className={`text-xs tabular-nums ${
                        a.gainLoss >= 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {a.gainLoss >= 0 ? "+" : ""}
                      {formatCurrency(convertedGain, currency)} (
                      {a.gainPct >= 0 ? "+" : ""}
                      {a.gainPct.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset Detail List */}
      {assets.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-sm mb-3">资产明细</h2>
          <div className="space-y-2">
            {assets.map((a) => {
              const converted = convertCurrency(
                a.marketValue,
                a.currency,
                currency,
                rates
              );
              return (
                <div key={a.id} className="flex justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-gray-400">
                      {CATEGORY_LABELS[a.category]}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums">
                    {formatCurrency(converted, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pie Charts */}
      <AllocationPieChart data={byCategory} title="按类别分配" />
      <AllocationPieChart data={byCurrency} title="按币种分配" />
    </div>
  );
}
