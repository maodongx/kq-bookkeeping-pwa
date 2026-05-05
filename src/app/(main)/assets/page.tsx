import { createClient } from "@/lib/supabase/server";
import { Asset, AssetCategory, Currency, Transaction } from "@/lib/types";
import { hasPerAssetGainLoss } from "@/lib/currency";
import { computeHolding } from "@/lib/asset-calculations";
import { convertCurrency, fetchLatestRates } from "@/lib/exchange-rates";
import { AssetsClient, CategoryGroup } from "@/components/AssetsClient";

/**
 * Show categories in a predictable order regardless of how assets were
 * created over time. Matches the order in CATEGORY_LABELS so the UI
 * feels stable between sessions.
 */
const CATEGORY_ORDER: AssetCategory[] = [
  "usStock",
  "jpFund",
  "cnFund",
  "mmf",
  "managed",
  "bankDeposit",
  "cash",
  "other",
];

export default async function AssetsPage() {
  const supabase = await createClient();

  const [
    { data: assets },
    { data: transactions },
    rates,
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("assets").select("*"),
    supabase.from("transactions").select("*"),
    fetchLatestRates(supabase),
    supabase.auth.getUser(),
  ]);

  const displayCurrency =
    (user?.user_metadata?.default_currency as Currency) || "USD";

  const assetList = (assets || []) as Asset[];
  const txList = (transactions || []) as Transaction[];

  // Bucket assets into per-category groups and sum in the display currency.
  // Per-asset marketValue and gainLoss come from the canonical computeHolding
  // helper so the numbers match the detail page and the charts.
  const groupMap = new Map<AssetCategory, CategoryGroup>();
  for (const asset of assetList) {
    const { marketValue, gainLoss, gainPct } = computeHolding(asset, txList);
    const showGain = hasPerAssetGainLoss(asset.category);

    const row = {
      id: asset.id,
      name: asset.name,
      symbol: asset.symbol,
      tag: asset.tag,
      riskLevel: asset.risk_level,
      valueInDisplay: convertCurrency(
        marketValue,
        asset.currency,
        displayCurrency,
        rates
      ),
      gainLossInDisplay: showGain
        ? convertCurrency(gainLoss, asset.currency, displayCurrency, rates)
        : null,
      gainPct: showGain ? gainPct : null,
    };

    let group = groupMap.get(asset.category);
    if (!group) {
      group = { category: asset.category, assets: [], totalValue: 0 };
      groupMap.set(asset.category, group);
    }
    group.assets.push(row);
    group.totalValue += row.valueInDisplay;
  }

  // Emit groups in CATEGORY_ORDER, skipping any category the user has no
  // assets in. Inside each group, show the biggest position first — that's
  // what the user is most likely scanning for on a small iPhone screen.
  const groups: CategoryGroup[] = CATEGORY_ORDER.map((c) => groupMap.get(c)).filter(
    (g): g is CategoryGroup => g !== undefined
  );
  for (const g of groups) {
    g.assets.sort((a, b) => b.valueInDisplay - a.valueInDisplay);
  }

  return <AssetsClient groups={groups} displayCurrency={displayCurrency} />;
}
