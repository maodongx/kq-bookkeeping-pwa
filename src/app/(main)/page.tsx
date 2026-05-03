import { createClient } from "@/lib/supabase/server";
import { Asset, Transaction } from "@/lib/types";
import { isInvestment } from "@/lib/currency";
import { fetchLatestRates } from "@/lib/exchange-rates";
import { DashboardClient, EnrichedAsset } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: assets }, { data: transactions }, rates] = await Promise.all([
    supabase.from("assets").select("*"),
    supabase.from("transactions").select("*"),
    fetchLatestRates(supabase),
  ]);

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
      marketValue,
      totalCost,
      gainLoss,
      gainPct,
    };
  });

  return (
    <DashboardClient
      assets={enriched}
      rates={rates}
      defaultCurrency="USD"
      lastUpdate={lastUpdate}
    />
  );
}
