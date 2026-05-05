import { SpendingClient } from "@/components/bookkeeping/SpendingClient";

/**
 * /spending — category grid for quick-entry bookkeeping.
 *
 * Auth is enforced by (main)/layout.tsx. Spending + budgets are shared-
 * household (no user_id, matching assets/transactions), so the page
 * does no server-side fetch — the client component owns writes and
 * keeps the grid purely local.
 */
export default function SpendingPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">记账</h1>
      <SpendingClient />
    </div>
  );
}
