import { createClient } from "@/lib/supabase/server";
import { Asset, AssetPriceSnapshot, ExchangeRateSnapshot, Currency, Transaction } from "@/lib/types";
import { isInvestment } from "@/lib/currency";
import { fetchLatestRates } from "@/lib/exchange-rates";
import { computeNetWorthTimeSeries } from "@/lib/chart-utils";
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

  const lastUpdate = assetList
    .map((a) => a.last_price_update)
    .filter(Boolean)
    .sort()
    .pop() as string | null;

  const enriched: EnrichedAsset[] = assetList.map((asset) => {
    const assetTxs = txList.filter((tx) => tx.asset_id === asset.id);
    const inv = isInvestment(asset.category);

    const totalQty = assetTxs.reduce((sum, tx) => {
      if (tx.type === "buy" || tx.type === "deposit") return sum + tx.quantity;
      if (tx.type === "sell" || tx.type === "withdraw") return sum - tx.quantity;
      return sum + tx.quantity;
    }, 0);

    const totalCost = assetTxs.reduce((sum, tx) => {
      if (tx.type === "buy") return sum + tx.amount;
      if (tx.type === "sell") return sum - tx.amount;
      return sum;
    }, 0);

    const balance = assetTxs.reduce((sum, tx) => {
      if (tx.type === "buy" || tx.type === "deposit") return sum + tx.amount;
      if (tx.type === "sell" || tx.type === "withdraw") return sum - tx.amount;
      return sum + tx.amount;
    }, 0);

    const marketValue =
      inv && asset.current_price ? totalQty * asset.current_price : balance;
    const gainLoss = inv ? marketValue - totalCost : 0;
    const gainPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

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

  const pSnaps = (priceSnapshots || []) as AssetPriceSnapshot[];
  const rSnaps = (rateSnapshots || []) as ExchangeRateSnapshot[];

  const allTimeSeries = computeNetWorthTimeSeries(
    assetList, txList, pSnaps, rSnaps, defaultCurrency, "ALL"
  );
  const oneMonthSeries = computeNetWorthTimeSeries(
    assetList, txList, pSnaps, rSnaps, defaultCurrency, "1M"
  );

  const totalCostAll = enriched.reduce((sum, a) => sum + a.totalCost, 0);
  const firstPoint = allTimeSeries[0] ?? null;
  const oneMonthAgoPoint = oneMonthSeries[0] ?? null;

  return (
    <DashboardClient
      assets={enriched}
      rates={rates}
      defaultCurrency={defaultCurrency}
      lastUpdate={lastUpdate}
      totalCost={totalCostAll}
      firstSnapshotDate={firstPoint?.date ?? null}
      firstSnapshotNetWorth={firstPoint?.netWorth ?? null}
      oneMonthAgoNetWorth={oneMonthAgoPoint?.netWorth ?? null}
    />
  );
}
