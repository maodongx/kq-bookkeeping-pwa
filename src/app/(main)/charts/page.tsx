import { createClient } from "@/lib/supabase/server";
import { Asset, Currency, Transaction, AssetPriceSnapshot, ExchangeRateSnapshot } from "@/lib/types";
import { fetchLatestRates } from "@/lib/exchange-rates";
import { ChartsClient } from "@/components/ChartsClient";

export default async function ChartsPage() {
  const supabase = await createClient();

  const [
    { data: assets },
    { data: transactions },
    { data: priceSnapshots },
    { data: rateSnapshots },
    rates,
    { data: { user } },
  ] = await Promise.all([
    supabase.from("assets").select("*"),
    supabase.from("transactions").select("*"),
    supabase.from("asset_price_snapshots").select("*").order("date"),
    supabase.from("exchange_rate_snapshots").select("*").order("date"),
    fetchLatestRates(supabase),
    supabase.auth.getUser(),
  ]);

  const defaultCurrency =
    (user?.user_metadata?.default_currency as Currency) || "USD";

  return (
    <ChartsClient
      assets={(assets || []) as Asset[]}
      transactions={(transactions || []) as Transaction[]}
      priceSnapshots={(priceSnapshots || []) as AssetPriceSnapshot[]}
      rateSnapshots={(rateSnapshots || []) as ExchangeRateSnapshot[]}
      rates={rates}
      defaultCurrency={defaultCurrency}
    />
  );
}
