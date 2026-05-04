import { createClient } from "@/lib/supabase/server";
import { Asset, AssetPriceSnapshot, ExchangeRateSnapshot, Currency, Transaction } from "@/lib/types";
import { fetchLatestRates } from "@/lib/exchange-rates";
import { computeHolding } from "@/lib/asset-calculations";
import { DashboardClient, EnrichedAsset } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: assets },
    { data: transactions },
    rates,
    { data: { user } },
    { data: priceSnapshots },
    { data: rateSnapshots },
  ] = await Promise.all([
    supabase.from("assets").select("*"),
    supabase.from("transactions").select("*"),
    fetchLatestRates(supabase),
    supabase.auth.getUser(),
    supabase.from("asset_price_snapshots").select("*").order("date"),
    supabase.from("exchange_rate_snapshots").select("*").order("date"),
  ]);

  const defaultCurrency =
    (user?.user_metadata?.default_currency as Currency) || "USD";

  const assetList = (assets || []) as Asset[];
  const txList = (transactions || []) as Transaction[];
  const pSnaps = (priceSnapshots || []) as AssetPriceSnapshot[];
  const rSnaps = (rateSnapshots || []) as ExchangeRateSnapshot[];

  const lastUpdate = assetList
    .map((a) => a.last_price_update)
    .filter(Boolean)
    .sort()
    .pop() as string | null;

  // Build per-asset enrichment. marketValue and totalCost are kept in the
  // asset's NATIVE currency so the client can re-convert them into the
  // currently-selected display currency without having to re-fetch.
  const enriched: EnrichedAsset[] = assetList.map((asset) => {
    const { totalCost, marketValue, gainLoss, gainPct } = computeHolding(
      asset,
      txList
    );
    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      currency: asset.currency,
      symbol: asset.symbol,
      tag: asset.tag,
      riskLevel: asset.risk_level,
      marketValue,
      totalCost,
      gainLoss,
      gainPct,
    };
  });

  return (
    <DashboardClient
      assets={enriched}
      rawAssets={assetList}
      transactions={txList}
      priceSnapshots={pSnaps}
      rateSnapshots={rSnaps}
      rates={rates}
      defaultCurrency={defaultCurrency}
      lastUpdate={lastUpdate}
    />
  );
}
