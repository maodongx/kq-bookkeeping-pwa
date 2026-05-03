import { Asset, Transaction, AssetPriceSnapshot, ExchangeRateSnapshot, Currency } from "./types";
import { isInvestment } from "./currency";
import { RateMap, convertCurrency } from "./exchange-rates";

export type TimeRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "1W": "1周",
  "1M": "1月",
  "3M": "3月",
  "6M": "6月",
  "1Y": "1年",
  ALL: "全部",
};

export function getStartDate(range: TimeRange): Date | null {
  if (range === "ALL") return null;
  const now = new Date();
  switch (range) {
    case "1W": now.setDate(now.getDate() - 7); break;
    case "1M": now.setMonth(now.getMonth() - 1); break;
    case "3M": now.setMonth(now.getMonth() - 3); break;
    case "6M": now.setMonth(now.getMonth() - 6); break;
    case "1Y": now.setFullYear(now.getFullYear() - 1); break;
  }
  return now;
}

function buildRateMapForDate(
  rateSnapshots: ExchangeRateSnapshot[],
  date: string
): RateMap {
  const rates: RateMap = {
    USD: { USD: 1, JPY: 0, CNY: 0 },
    JPY: { USD: 0, JPY: 1, CNY: 0 },
    CNY: { USD: 0, JPY: 0, CNY: 1 },
  };

  const candidates = rateSnapshots.filter((r) => r.date <= date);
  const seen = new Set<string>();

  for (let i = candidates.length - 1; i >= 0; i--) {
    const r = candidates[i];
    const key = `${r.base_currency}_${r.target_currency}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rates[r.base_currency as Currency][r.target_currency as Currency] = Number(r.rate);
    if (seen.size === 6) break;
  }

  return rates;
}

function getAssetValueOnDate(
  asset: Asset,
  transactions: Transaction[],
  priceSnapshots: AssetPriceSnapshot[],
  date: string
): number {
  const txsBefore = transactions.filter(
    (tx) => tx.asset_id === asset.id && tx.date <= date
  );

  if (txsBefore.length === 0) return 0;

  if (isInvestment(asset.category)) {
    const qty = txsBefore.reduce((sum, tx) => {
      if (tx.type === "buy") return sum + tx.quantity;
      if (tx.type === "sell") return sum - tx.quantity;
      return sum;
    }, 0);

    const snap = priceSnapshots
      .filter((s) => s.asset_id === asset.id && s.date <= date)
      .pop();
    const price = snap ? Number(snap.price) : asset.current_price || 0;

    return qty * price;
  }

  return txsBefore.reduce((sum, tx) => {
    if (tx.type === "deposit" || tx.type === "buy") return sum + tx.amount;
    if (tx.type === "withdraw" || tx.type === "sell") return sum - tx.amount;
    return sum + tx.amount;
  }, 0);
}

export function computeNetWorthTimeSeries(
  assets: Asset[],
  transactions: Transaction[],
  priceSnapshots: AssetPriceSnapshot[],
  rateSnapshots: ExchangeRateSnapshot[],
  targetCurrency: Currency,
  range: TimeRange
): Array<{ date: string; netWorth: number }> {
  const sortedPriceSnaps = [...priceSnapshots].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const sortedRateSnaps = [...rateSnapshots].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const allDates = new Set<string>();
  sortedPriceSnaps.forEach((s) => allDates.add(s.date));
  sortedRateSnaps.forEach((s) => allDates.add(s.date));

  const startDate = getStartDate(range);
  const startStr = startDate ? startDate.toISOString().slice(0, 10) : null;

  const dates = Array.from(allDates)
    .filter((d) => !startStr || d >= startStr)
    .sort();

  if (dates.length === 0) return [];

  return dates.map((date) => {
    const rateMap = buildRateMapForDate(sortedRateSnaps, date);
    const netWorth = assets.reduce((sum, asset) => {
      const value = getAssetValueOnDate(
        asset,
        transactions,
        sortedPriceSnaps,
        date
      );
      return sum + convertCurrency(value, asset.currency, targetCurrency, rateMap);
    }, 0);
    return { date, netWorth };
  });
}

export interface GainLossItem {
  name: string;
  gainLoss: number;
  gainPct: number;
}

export function computeGainLossPerAsset(
  assets: Asset[],
  transactions: Transaction[],
  targetCurrency: Currency,
  rates: RateMap
): GainLossItem[] {
  return assets
    .filter((a) => isInvestment(a.category))
    .map((asset) => {
      const txs = transactions.filter((tx) => tx.asset_id === asset.id);
      const totalQty = txs.reduce((sum, tx) => {
        if (tx.type === "buy") return sum + tx.quantity;
        if (tx.type === "sell") return sum - tx.quantity;
        return sum;
      }, 0);
      const totalCost = txs.reduce((sum, tx) => {
        if (tx.type === "buy") return sum + tx.amount;
        if (tx.type === "sell") return sum - tx.amount;
        return sum;
      }, 0);
      const marketValue = asset.current_price
        ? totalQty * asset.current_price
        : 0;
      const gainLoss = marketValue - totalCost;
      const gainPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

      return {
        name: asset.name,
        gainLoss: convertCurrency(gainLoss, asset.currency, targetCurrency, rates),
        gainPct,
      };
    })
    .filter((item) => item.gainLoss !== 0 || item.gainPct !== 0)
    .sort((a, b) => b.gainLoss - a.gainLoss);
}
