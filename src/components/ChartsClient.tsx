"use client";

import { useState } from "react";
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
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">分析</h1>

      <div className="flex justify-center">
        <CurrencySwitcher value={currency} onChange={setCurrency} />
      </div>

      {/* Time Range Picker */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-gray-100 p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                range === r
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {TIME_RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <NetWorthLineChart data={timeSeries} currency={currency} />
      <GainLossBarChart data={gainLossData} currency={currency} />

      {assets.length === 0 && (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400">
          <p className="text-4xl mb-2">📈</p>
          <p>添加资产和交易后将展示分析</p>
        </div>
      )}
    </div>
  );
}
