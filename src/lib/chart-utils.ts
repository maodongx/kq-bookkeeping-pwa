import { Asset, Transaction, AssetPriceSnapshot, ExchangeRateSnapshot, Currency } from "./types";
import { isInvestment } from "./currency";
import { RateMap, convertCurrency } from "./exchange-rates";
import { computeHolding } from "./asset-calculations";
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
    rates[r.base_currency][r.target_currency] = Number(r.rate);
    if (seen.size === 6) break;
  }

  return rates;
}

/**
 * Market value of an asset on a specific historical date in the asset's
 * native currency. Delegates transaction replay to `computeHolding` and
 * looks up the latest price snapshot on or before `date` for investments.
 * Shared by the net-worth time series and per-asset period returns on
 * the assets tab.
 */
export function getAssetValueOnDate(
  asset: Asset,
  transactions: Transaction[],
  priceSnapshots: AssetPriceSnapshot[],
  date: string
): number {
  const txsBefore = transactions.filter(
    (tx) => tx.asset_id === asset.id && tx.date <= date
  );

  if (txsBefore.length === 0) return 0;

  // Delegate transaction replay to computeHolding — the canonical
  // "given these transactions, what's the position?" helper. This keeps
  // historical net-worth reconstruction consistent with per-asset views
  // (detail page, gain/loss bar chart) and picks up adjustment-quantity
  // handling for free. We only override the PRICE side for investments,
  // since computeHolding's marketValue uses today's price but the
  // historical series wants the price snapshot on or before `date`.
  const { totalQty, balance } = computeHolding(asset, txsBefore);

  if (isInvestment(asset.category)) {
    const snap = priceSnapshots
      .filter((s) => s.asset_id === asset.id && s.date <= date)
      .pop();
    const price = snap ? Number(snap.price) : asset.current_price || 0;
    return totalQty * price;
  }

  return balance;
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
