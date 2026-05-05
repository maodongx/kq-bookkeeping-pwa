import { createClient } from "@/lib/supabase/server";
import { Asset, AssetPriceSnapshot, ExchangeRateSnapshot, Currency, Transaction } from "@/lib/types";
import { fetchLatestRates } from "@/lib/exchange-rates";
import { computeHolding } from "@/lib/asset-calculations";
import { DashboardAsset } from "@/lib/dashboard-stats";
import { DashboardClient } from "@/components/DashboardClient";

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

  // Project each asset to the minimal shape the dashboard needs. marketValue
  // and totalCost stay in the asset's native currency so the client can
  // re-convert into the user-selected display currency without a refetch.
  const dashboardAssets: DashboardAsset[] = assetList.map((asset) => {
    const { marketValue, totalCost } = computeHolding(asset, txList);
    return {
      currency: asset.currency,
      marketValue,
      totalCost,
      tag: asset.tag,
      riskLevel: asset.risk_level,
    };
  });

  return (
    <DashboardClient
      assets={dashboardAssets}
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
