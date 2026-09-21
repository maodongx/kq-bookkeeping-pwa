import { SupabaseClient } from "@supabase/supabase-js";
import { Currency } from "./types";

export type RateMap = Record<Currency, Record<Currency, number>>;

const CURRENCIES: Currency[] = ["USD", "JPY", "CNY"];

/**
 * A rate is only usable if it's a finite positive number. `0` in particular
 * has to be treated as "missing", not as a rate — multiplying by it silently
 * values every asset in that currency at nothing, which is far worse than a
 * visibly stale number.
 */
function isUsableRate(rate: number | undefined | null): rate is number {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
}

/** A rate map with the diagonal set to 1 and every cross pair unset. */
export function emptyRateMap(): RateMap {
  return {
    USD: { USD: 1, JPY: 0, CNY: 0 },
    JPY: { USD: 0, JPY: 1, CNY: 0 },
    CNY: { USD: 0, JPY: 0, CNY: 1 },
  };
}

/**
 * Fill in every cross pair that has no usable direct rate.
 *
 * Tries the inverse first (JPY→USD from USD→JPY), then triangulates through a
 * third currency (JPY→CNY as USD→CNY ÷ USD→JPY). With three currencies, any
 * two independent rates determine all six, so a partially-failed refresh no
 * longer leaves a hole.
 *
 * This matters because `/api/exchange-rates` fetches each base separately
 * under `Promise.allSettled` — one failing base used to leave that row's pairs
 * at 0, and `convertCurrency` would then report those assets as worth nothing
 * with no error anywhere in the UI.
 *
 * Only when nothing at all is known does a pair stay at 1:1. That's still
 * wrong, but it keeps magnitudes in the right ballpark instead of zeroing the
 * portfolio, and it matches the long-standing empty-table behavior.
 */
export function deriveMissingRates(rates: RateMap): RateMap {
  const out: RateMap = {
    USD: { ...rates.USD },
    JPY: { ...rates.JPY },
    CNY: { ...rates.CNY },
  };

  for (const from of CURRENCIES) {
    out[from][from] = 1;
  }

  for (const from of CURRENCIES) {
    for (const to of CURRENCIES) {
      if (from === to || isUsableRate(out[from][to])) continue;

      if (isUsableRate(out[to][from])) {
        out[from][to] = 1 / out[to][from];
        continue;
      }

      const via = CURRENCIES.find(
        (mid) =>
          mid !== from &&
          mid !== to &&
          isUsableRate(out[from][mid]) &&
          isUsableRate(out[mid][to])
      );
      if (via) {
        out[from][to] = out[from][via] * out[via][to];
        continue;
      }

      out[from][to] = 1;
    }
  }

  return out;
}

export async function fetchLatestRates(
  supabase: SupabaseClient
): Promise<RateMap> {
  const rates = emptyRateMap();

  // 60 rows is ~10 days at 6 pairs/day. Ordering newest-first and taking the
  // first occurrence of each pair means a day with a partial write (some pairs
  // missing) transparently falls back to the previous day for those pairs.
  // The old `.limit(9)` was a magic number that broke the moment a day wrote
  // fewer than 6 rows.
  const { data } = await supabase
    .from("exchange_rate_snapshots")
    .select("*")
    .order("date", { ascending: false })
    .limit(60);

  const seen = new Set<string>();
  for (const row of data ?? []) {
    const base = row.base_currency as Currency;
    const target = row.target_currency as Currency;
    if (base === target) continue;

    const key = `${base}_${target}`;
    if (seen.has(key)) continue;

    const rate = Number(row.rate);
    if (!isUsableRate(rate)) continue;

    seen.add(key);
    rates[base][target] = rate;
  }

  return deriveMissingRates(rates);
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: RateMap
): number {
  if (from === to) return amount;
  const rate = rates[from]?.[to];
  // Should be unreachable once the map has been through `deriveMissingRates`,
  // but guard anyway: passing the amount through unconverted keeps the order
  // of magnitude roughly right, where `* 0` would erase the asset entirely.
  return isUsableRate(rate) ? amount * rate : amount;
}

export function totalNetWorth(
  assets: Array<{ marketValue: number; currency: Currency }>,
  targetCurrency: Currency,
  rates: RateMap
): number {
  return assets.reduce(
    (sum, a) => sum + convertCurrency(a.marketValue, a.currency, targetCurrency, rates),
    0
  );
}
