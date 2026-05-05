import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Asset, AssetPriceSnapshot, ExchangeRateSnapshot, Currency, Transaction } from "@/lib/types";
import { fetchLatestRates } from "@/lib/exchange-rates";
import { computeHolding } from "@/lib/asset-calculations";
import { DashboardAsset } from "@/lib/dashboard-stats";
import { DashboardClient } from "@/components/DashboardClient";
import { RefreshPricesButton } from "@/components/RefreshPricesButton";

/**
 * Static shell — synchronous, no awaits, so it renders immediately when
 * the route transitions. The title and refresh button paint right away;
 * the data-dependent body streams in via the Suspense boundary below.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">总览</h1>
        <RefreshPricesButton />
      </div>
      <Suspense fallback={<DashboardBodySkeleton />}>
        <DashboardBody />
      </Suspense>
    </div>
  );
}

async function DashboardBody() {
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

  // Project each asset to the minimal shape the dashboard needs.
  // marketValue stays in the asset's native currency; the client
  // converts into the user-selected display currency per render.
  // Per-asset cost basis is no longer on this projection — the
  // dashboard derives "total gain" from cross-asset capital flows.
  const dashboardAssets: DashboardAsset[] = assetList.map((asset) => ({
    currency: asset.currency,
    marketValue: computeHolding(asset, txList).marketValue,
    tag: asset.tag,
    riskLevel: asset.risk_level,
  }));

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

/**
 * Shape-matching placeholder for the dashboard body: currency switcher
 * (centered pill), total-net-worth card, 3-card stat grid, two pie
 * chart blocks. Matches DashboardClient's layout closely enough that
 * the fill-in feels like parts of the same page resolving rather than
 * a layout shift.
 */
function DashboardBodySkeleton() {
  return (
    <>
      <div className="flex justify-center">
        <div className="h-10 w-48 animate-pulse rounded-full bg-default" />
      </div>
      <div className="h-20 animate-pulse rounded-2xl bg-default" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 animate-pulse rounded-2xl bg-default" />
        <div className="h-16 animate-pulse rounded-2xl bg-default" />
        <div className="h-16 animate-pulse rounded-2xl bg-default" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-default" />
      <div className="h-64 animate-pulse rounded-2xl bg-default" />
    </>
  );
}
