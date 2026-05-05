import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Client-side Router Cache for RSC payloads. When a user tabs away
     * from a page, Next.js keeps the serialized React server tree
     * (including all the Supabase data that was embedded in it) around
     * for this many seconds. Tab-back within the window reuses the
     * cached tree — zero server request, instant paint, no Supabase
     * queries.
     *
     * Defaults for dynamic routes are 0 in Next 15/16, i.e. no client
     * cache. This app is a 2-user PWA with small data; aggressive
     * client caching is the single biggest perceived-perf win.
     *
     * Mutations already call router.refresh() (AddTransactionForm,
     * TransactionRow, DeleteAssetButton, EditPriceButton, AssetForm,
     * RefreshPricesButton, CurrencyPreferencePicker, ImportSection).
     * That invalidates the current route's cache, so writes are
     * reflected immediately on the page that triggered them. Other
     * routes may show up-to-30s-stale data until their own cache
     * entries expire or the user hits refresh.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
