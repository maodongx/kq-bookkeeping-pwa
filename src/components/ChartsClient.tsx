"use client";

import { useState } from "react";
import { Card, Tabs } from "@heroui/react";
import { Asset, Transaction, AssetPriceSnapshot, ExchangeRateSnapshot, Currency } from "@/lib/types";
import { RateMap } from "@/lib/exchange-rates";
import {
  TimeRange,
  TIME_RANGE_LABELS,
  computeNetWorthTimeSeries,
  computeGainLossPerAsset,
} from "@/lib/chart-utils";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { NetWorthLineChart } from "./NetWorthLineChart";
import { GainLossBarChart } from "./GainLossBarChart";

const TIME_RANGES: TimeRange[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

export function ChartsClient({
  assets,
  transactions,
  priceSnapshots,
  rateSnapshots,
  rates,
  defaultCurrency,
}: {
  assets: Asset[];
  transactions: Transaction[];
  priceSnapshots: AssetPriceSnapshot[];
  rateSnapshots: ExchangeRateSnapshot[];
  rates: RateMap;
  defaultCurrency: Currency;
}) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [range, setRange] = useState<TimeRange>("3M");

  const timeSeries = computeNetWorthTimeSeries(
    assets,
    transactions,
    priceSnapshots,
    rateSnapshots,
    currency,
    range
  );

  const gainLossData = computeGainLossPerAsset(
    assets,
    transactions,
    currency,
    rates
  );

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">分析</h1>

      <div className="flex justify-center">
        <CurrencySwitcher value={currency} onChange={setCurrency} />
      </div>

      <div className="flex justify-center">
        <Tabs
          selectedKey={range}
          onSelectionChange={(k) => setRange(k as TimeRange)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="时间范围">
              {TIME_RANGES.map((r) => (
                <Tabs.Tab key={r} id={r}>
                  {TIME_RANGE_LABELS[r]}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      <NetWorthLineChart data={timeSeries} currency={currency} />
      <GainLossBarChart data={gainLossData} currency={currency} />

      {assets.length === 0 && (
        <Card className="p-8 text-center">
          <p className="mb-2 text-4xl">📈</p>
          <p className="text-muted">添加资产和交易后将展示分析</p>
        </Card>
      )}
    </div>
  );
}
