import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Asset, Currency, Transaction, AssetPriceSnapshot, ExchangeRateSnapshot } from "@/lib/types";
import { ChartsClient } from "@/components/ChartsClient";

/**
 * Static shell — title paints immediately; the currency switcher,
 * range picker, and line chart stream in via the Suspense boundary.
 */
export default function ChartsPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">分析</h1>
      <Suspense fallback={<ChartsBodySkeleton />}>
        <ChartsBody />
      </Suspense>
    </div>
  );
}

async function ChartsBody() {
  const supabase = await createClient();

  const [
    { data: assets },
    { data: transactions },
    { data: priceSnapshots },
    { data: rateSnapshots },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("assets").select("*"),
    supabase.from("transactions").select("*"),
    supabase.from("asset_price_snapshots").select("*").order("date"),
    supabase.from("exchange_rate_snapshots").select("*").order("date"),
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
      defaultCurrency={defaultCurrency}
    />
  );
}

/**
 * Shape-matching placeholder: currency pill, range toggle pill, and a
 * tall line-chart area.
 */
function ChartsBodySkeleton() {
  return (
    <>
      <div className="flex justify-center">
        <div className="h-10 w-48 animate-pulse rounded-full bg-default" />
      </div>
      <div className="flex justify-center">
        <div className="h-10 w-72 animate-pulse rounded-full bg-default" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-default" />
    </>
  );
}
