/**
 * Instant loading skeleton shown while any (main) route fetches server
 * data. Next.js treats loading.tsx as a Suspense fallback for the page
 * segment, so on every tab tap the BottomTabBar stays in place and this
 * skeleton fills the content area the moment the user clicks — the
 * "continue loading after click, top to bottom" feel of a native app.
 *
 * Intentionally generic rather than route-specific. The shape is close
 * enough to the dashboard, assets, charts, and settings pages that
 * maintaining four separate skeletons would be churn for little gain on
 * an iPhone viewport.
 */
export default function Loading() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-live="polite">
      {/* Header row — title placeholder and an action chip on the right */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-20 animate-pulse rounded bg-default" />
        <div className="h-8 w-20 animate-pulse rounded-full bg-default" />
      </div>

      {/* Primary content block (e.g. total net worth card) */}
      <div className="h-20 animate-pulse rounded-2xl bg-default" />

      {/* Secondary row (e.g. stat grid or toggle group) */}
      <div className="h-12 animate-pulse rounded-2xl bg-default" />

      {/* Main content blocks (pie charts, accordion, or line chart area) */}
      <div className="h-56 animate-pulse rounded-2xl bg-default" />
      <div className="h-56 animate-pulse rounded-2xl bg-default" />
    </div>
  );
}
