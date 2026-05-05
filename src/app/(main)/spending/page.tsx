import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SpendingClient } from "@/components/bookkeeping/SpendingClient";

/**
 * The (main)/layout.tsx already enforces auth and redirects to /login,
 * so this page can trust that a user exists. We still need the user id
 * for writes — reading it here is ~cookie-local and cheap.
 *
 * Following the app-wide pattern: sync shell + Suspense body so the
 * header paints instantly and the data-dependent body streams in.
 * /spending itself has no server data today (categories are local), but
 * the pattern matches its siblings so tab transitions feel uniform.
 */
export default function SpendingPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">记账</h1>
      <Suspense fallback={<SpendingBodySkeleton />}>
        <SpendingBody />
      </Suspense>
    </div>
  );
}

async function SpendingBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Layout guarantees auth — assert non-null to satisfy the type checker
  // rather than redirect again.
  return <SpendingClient userId={user!.id} />;
}

function SpendingBodySkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-default" />
      ))}
    </div>
  );
}
