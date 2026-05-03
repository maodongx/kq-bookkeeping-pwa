import { SupabaseClient } from "@supabase/supabase-js";
import { Currency } from "./types";

export type RateMap = Record<Currency, Record<Currency, number>>;

const IDENTITY_RATES: RateMap = {
  USD: { USD: 1, JPY: 1, CNY: 1 },
  JPY: { USD: 1, JPY: 1, CNY: 1 },
  CNY: { USD: 1, JPY: 1, CNY: 1 },
};

export async function fetchLatestRates(
  supabase: SupabaseClient
): Promise<RateMap> {
  const rates: RateMap = {
    USD: { USD: 1, JPY: 0, CNY: 0 },
    JPY: { USD: 0, JPY: 1, CNY: 0 },
    CNY: { USD: 0, JPY: 0, CNY: 1 },
  };

  const { data } = await supabase
    .from("exchange_rate_snapshots")
    .select("*")
    .order("date", { ascending: false })
    .limit(9);

  if (!data || data.length === 0) return IDENTITY_RATES;

  const seen = new Set<string>();
  for (const row of data) {
    const key = `${row.base_currency}_${row.target_currency}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const base = row.base_currency as Currency;
    const target = row.target_currency as Currency;
    rates[base][target] = Number(row.rate);
  }

  return rates;
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: RateMap
): number {
  if (from === to) return amount;
  return amount * rates[from][to];
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
