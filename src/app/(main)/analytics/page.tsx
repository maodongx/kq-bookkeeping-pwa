import { AnalyticsClient } from "@/components/bookkeeping/AnalyticsClient";

/**
 * /analytics — monthly spending chart + category breakdown + budget cards.
 *
 * Auth is enforced by (main)/layout.tsx. Data is fetched client-side by
 * AnalyticsClient (month navigation is client-state; a server fetch per
 * arrow tap would thrash the router cache).
 */
export default function AnalyticsPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">分析</h1>
      <AnalyticsClient />
    </div>
  );
}
