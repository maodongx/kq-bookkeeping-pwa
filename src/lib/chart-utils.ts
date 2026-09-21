import { Asset, Transaction, AssetPriceSnapshot, ExchangeRateSnapshot, Currency } from "./types";
import { isInvestment } from "./currency";
import {
  RateMap,
  convertCurrency,
  deriveMissingRates,
  emptyRateMap,
  totalNetWorth,
} from "./exchange-rates";
import { computeHolding } from "./asset-calculations";
import { formatLocalDate, todayLocal } from "./date";
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
  const rates = emptyRateMap();

  const seen = new Set<string>();
  const take = (r: ExchangeRateSnapshot) => {
    if (r.base_currency === r.target_currency) return;
    const key = `${r.base_currency}_${r.target_currency}`;
    if (seen.has(key)) return;
    seen.add(key);
    rates[r.base_currency][r.target_currency] = Number(r.rate);
  };

  // Preferred: the most recent snapshot on or before `date`. `rateSnapshots`
  // is sorted ascending, so walking backwards hits the newest first.
  for (let i = rateSnapshots.length - 1; i >= 0 && seen.size < 6; i--) {
    if (rateSnapshots[i].date <= date) take(rateSnapshots[i]);
  }

  // Fallback for dates that predate the first snapshot of a pair: use the
  // earliest rate we have rather than leaving the pair at 0. A zero rate
  // values every asset in that currency at nothing, which rendered as a fake
  // hockey-stick at the left edge of the net-worth chart and fed a bogus
  // starting balance into the annualized return.
  for (let i = 0; i < rateSnapshots.length && seen.size < 6; i++) {
    take(rateSnapshots[i]);
  }

  // Anything still unset gets inverted or triangulated from what we do have.
  return deriveMissingRates(rates);
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

/**
 * Whether a *real* historical price is known for `asset` on or before `date`.
 *
 * `getAssetValueOnDate` falls back to `asset.current_price` when no snapshot
 * reaches back that far. That's the right call for the net-worth chart —
 * valuing a position at some price beats silently dropping it — but it is the
 * wrong basis for a "change since `date`" figure, because the fallback *is*
 * today's price. The delta then works out to exactly zero and the assets tab
 * reports a confident `近1月 +0.00%` for a window it actually knows nothing
 * about.
 *
 * Callers computing a period return should check this first and render `—`
 * instead. Balance-model assets (mmf/managed/bank/cash) always return true:
 * their value comes from replaying transactions, so no price is involved.
 */
export function hasHistoricalPrice(
  asset: Asset,
  priceSnapshots: AssetPriceSnapshot[],
  date: string
): boolean {
  if (!isInvestment(asset.category)) return true;
  return priceSnapshots.some((s) => s.asset_id === asset.id && s.date <= date);
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
  // `getStartDate` subtracts from a local-time Date, so format it with the
  // local fields too. Going through `toISOString()` reads the UTC day, which
  // in a UTC+9 morning is still *yesterday* — that quietly stretched every
  // window by a day (1W covered 8 days).
  const startStr = startDate ? formatLocalDate(startDate) : null;

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

/**
 * Current net worth, computed exactly the way the dashboard's 总资产 card
 * computes it: live `assets.current_price`, live exchange rates, and every
 * transaction regardless of date.
 */
export function liveNetWorth(
  assets: Asset[],
  transactions: Transaction[],
  targetCurrency: Currency,
  rates: RateMap
): number {
  return totalNetWorth(
    assets.map((asset) => ({
      currency: asset.currency,
      marketValue: computeHolding(asset, transactions).marketValue,
    })),
    targetCurrency,
    rates
  );
}

/**
 * The net-worth series to *display*: the snapshot-derived history with a
 * final "now" point appended.
 *
 * `computeNetWorthTimeSeries` can only ever be as fresh as the newest
 * snapshot, and it values investments at their snapshot price. The 总资产
 * card instead reads live prices, live rates, and all transactions. So
 * without this the chart's last point and 总资产 disagreed whenever anything
 * landed after the newest snapshot — which is most of the time, because
 * snapshot dates are UTC (`todayUTC`) while transaction dates are local
 * (`todayLocal`), so in Tokyo a transaction entered before 09:00 is already
 * dated a day past the snapshot written alongside it. A manual price edit or
 * a newly added asset caused the same split.
 *
 * Deriving the last point from `liveNetWorth` makes the two agree by
 * construction rather than by coincidence.
 */
export function computeNetWorthChartSeries(
  assets: Asset[],
  transactions: Transaction[],
  priceSnapshots: AssetPriceSnapshot[],
  rateSnapshots: ExchangeRateSnapshot[],
  targetCurrency: Currency,
  range: TimeRange,
  rates: RateMap
): Array<{ date: string; netWorth: number }> {
  const history = computeNetWorthTimeSeries(
    assets,
    transactions,
    priceSnapshots,
    rateSnapshots,
    targetCurrency,
    range
  );

  if (assets.length === 0) return history;

  // Snapshots are stamped in UTC, so west of Greenwich the newest one can be
  // dated *after* the local day. Label the live point with whichever is later
  // so the series never steps backwards in time.
  const lastHistorical = history[history.length - 1]?.date;
  const today = todayLocal();
  const liveDate =
    lastHistorical && lastHistorical > today ? lastHistorical : today;

  return [
    ...history.filter((p) => p.date < liveDate),
    {
      date: liveDate,
      netWorth: liveNetWorth(assets, transactions, targetCurrency, rates),
    },
  ];
}
