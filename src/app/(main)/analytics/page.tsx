import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "@/components/bookkeeping/AnalyticsClient";

/**
 * Analytics page — spending charts and budget cards.
 *
 * Auth is enforced by (main)/layout.tsx; we only read the user id here
 * for the client component, which fetches spending data on its own
 * (month navigation is client-side to avoid a server round-trip per
 * arrow tap).
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <AnalyticsClient userId={user!.id} />;
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
