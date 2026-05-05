"use client";

import { useState } from "react";
import type { Key } from "@heroui/react";
import { Card, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import {
  Asset,
  AssetPriceSnapshot,
  Currency,
  ExchangeRateSnapshot,
  Transaction,
} from "@/lib/types";
import {
  TimeRange,
  TIME_RANGE_LABELS,
  computeNetWorthTimeSeries,
} from "@/lib/chart-utils";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { NetWorthLineChart } from "./NetWorthLineChart";

const TIME_RANGES: TimeRange[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

export function ChartsClient({
  assets,
  transactions,
  priceSnapshots,
  rateSnapshots,
  defaultCurrency,
}: {
  assets: Asset[];
  transactions: Transaction[];
  priceSnapshots: AssetPriceSnapshot[];
  rateSnapshots: ExchangeRateSnapshot[];
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

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">分析</h1>

      <div className="flex justify-center">
        <CurrencySwitcher value={currency} onChange={setCurrency} />
      </div>

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

      {assets.length === 0 && (
        <Card className="p-8 text-center">
          <p className="mb-2 text-4xl">📈</p>
          <p className="text-muted">添加资产和交易后将展示分析</p>
        </Card>
      )}
    </div>
  );
}
