"use client";

import { useState } from "react";
import { Currency, AssetCategory } from "@/lib/types";
import { formatCurrency, CATEGORY_LABELS, isInvestment } from "@/lib/currency";
import { RateMap, convertCurrency, totalNetWorth } from "@/lib/exchange-rates";
import { cn } from "@/lib/utils";
import { Card } from "@heroui/react";
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
              <Card key={c} className="gap-1 py-2">
                <Card.Content className="text-center">
                  <p className="text-xs text-muted">{c}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatCurrency(total, currency)}
                  </p>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}

      {investments.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>投资盈亏</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-2">
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
                <div key={a.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted">
                      {CATEGORY_LABELS[a.category]}
                      {a.symbol ? ` · ${a.symbol}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums">
                      {formatCurrency(converted, currency)}
                    </p>
                    <p
                      className={cn(
                        "text-xs tabular-nums",
                        a.gainLoss >= 0 ? "text-red-600" : "text-green-600"
                      )}
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
          </Card.Content>
        </Card>
      )}

      {assets.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>资产明细</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-2">
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
                    <p className="text-xs text-muted">
                      {CATEGORY_LABELS[a.category]}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums">
                    {formatCurrency(converted, currency)}
                  </p>
                </div>
              );
            })}
          </Card.Content>
        </Card>
      )}

      <AllocationPieChart data={byCategory} title="按类别分配" />
      <AllocationPieChart data={byCurrency} title="按币种分配" />
    </div>
  );
}
