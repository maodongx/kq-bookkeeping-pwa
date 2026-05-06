import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchLatestRates } from "@/lib/exchange-rates";
import { DetailsClient } from "@/components/bookkeeping/DetailsClient";
import type { Currency } from "@/lib/types";

/**
 * /details — all spending transactions grouped by date with quick-add
 * "+" buttons per date.
 *
 * Like /analytics, the user's default currency and latest exchange
 * rates are pre-fetched server-side so every displayed amount is
 * converted into one consistent currency. The edit modal still shows
 * the transaction's native currency — the conversion is display-only.
 */
export default function DetailsPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">明细</h1>
      <Suspense fallback={<DetailsSkeleton />}>
        <DetailsBody />
      </Suspense>
    </div>
  );
}

async function DetailsBody() {
  const supabase = await createClient();
  const [userResult, rates] = await Promise.all([
    supabase.auth.getUser(),
    fetchLatestRates(supabase),
  ]);
  const displayCurrency =
    (userResult.data.user?.user_metadata?.default_currency as Currency) ||
    "JPY";

  return <DetailsClient displayCurrency={displayCurrency} rates={rates} />;
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-24 animate-pulse rounded bg-default" />
          <div className="h-12 animate-pulse rounded-xl bg-default" />
        </div>
      ))}
    </div>
  );
}
