import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchLatestRates } from "@/lib/exchange-rates";
import { AnalyticsClient } from "@/components/bookkeeping/AnalyticsClient";
import type { Currency } from "@/lib/types";

/**
 * /analytics — monthly spending chart + category drill-down.
 *
 * The user's default currency (from user_metadata) and the latest
 * exchange-rate snapshots are pre-fetched here on the server so every
 * downstream computation and display in the tab uses one consistent
 * currency — not the mixed-currency raw values stored in the DB.
 */
export default function AnalyticsPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">分析</h1>
      <Suspense fallback={<AnalyticsBodySkeleton />}>
        <AnalyticsBody />
      </Suspense>
    </div>
  );
}

async function AnalyticsBody() {
  const supabase = await createClient();
  const [userResult, rates] = await Promise.all([
    supabase.auth.getUser(),
    fetchLatestRates(supabase),
  ]);
  const displayCurrency =
    (userResult.data.user?.user_metadata?.default_currency as Currency) ||
    "JPY";

  return <AnalyticsClient displayCurrency={displayCurrency} rates={rates} />;
}

function AnalyticsBodySkeleton() {
  return (
    <>
      <div className="h-10 animate-pulse rounded-2xl bg-default" />
      <div className="h-64 animate-pulse rounded-2xl bg-default" />
      <div className="h-20 animate-pulse rounded-2xl bg-default" />
      <div className="h-20 animate-pulse rounded-2xl bg-default" />
    </>
  );
}
