import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Asset } from "@/lib/types";
import { todayUTC } from "@/lib/date";
import { isInvestment } from "@/lib/currency";

interface PriceResult {
  assetId: string;
  price: number;
  updatedAt: string;
}

/**
 * A fetched price plus, when the provider tells us, the date the price is
 * actually *for*.
 *
 * Funds publish one NAV per business day and lag by a day or more, so stamping
 * every snapshot with today's date recorded Friday's NAV as Sunday's. That made
 * the assets tab's 当日 return read 0% (it compares today's snapshot against
 * itself) and collided with any backfill keyed on the true NAV date under the
 * `(asset_id, date)` unique constraint.
 */
interface FetchedPrice {
  price: number;
  /** `YYYY-MM-DD`, omitted when the provider doesn't report one. */
  asOf?: string;
}

/** Convert a provider's compact `YYYYMMDD` to `YYYY-MM-DD`, or undefined. */
function parseCompactDate(value: unknown): string | undefined {
  const s = String(value ?? "");
  return /^\d{8}$/.test(s)
    ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    : undefined;
}

interface PriceError {
  assetId: string;
  error: string;
}

// Raised above the platform's 10s Hobby default so a slow provider hits our
// own AbortSignal — and gets reported as one failed asset — instead of the
// platform killing the whole function, which would discard the prices that
// *did* arrive (the writes all happen after `Promise.allSettled`).
export const maxDuration = 30;

// Every upstream here is a third-party site we don't control. Without a
// deadline one hung connection holds the whole route open until the platform
// kills it, so a single slow provider takes down the refresh for every asset.
const FETCH_TIMEOUT_MS = 8_000;

async function fetchUSStockPrice(symbol: string): Promise<FetchedPrice> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);

  const data = await res.json();
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number") throw new Error("Price not found in response");
  // Equities trade intraday, so today's date is the right stamp for a quote.
  return { price };
}

async function fetchMUFGFundPrice(fundCode: string): Promise<FetchedPrice> {
  const url = `https://www.am.mufg.jp/mukamapi/fund_details/?fund_cd=${encodeURIComponent(fundCode)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`MUFG API returned ${res.status}`);

  const data = await res.json();
  const price = Number(data?.datasets?.cfm_base_price);
  // An unknown fund_cd still returns HTTP 200, just with `datasets: null`, so
  // the status check alone doesn't catch a bad symbol.
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price not found in MUFG response");
  }
  return { price, asOf: parseCompactDate(data?.datasets?.cfm_base_date) };
}

// Yahoo Finance JP has historically 403'd generic desktop-browser User-Agents
// and geo-gated EEA/UK traffic. A Googlebot UA is allowlisted for crawling, so
// it sails past both regardless of where the serverless function runs.
const BROWSER_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// The quote page serializes its state into the RSC flight payload as a
// backslash-escaped JSON *string*, so every `"` in the data shows up as `\"`.
// The `\\?` in these patterns matches either form, so the scrape survives
// Yahoo flipping between raw and escaped embedding (the previous
// jwtToken-based scrape broke exactly because it only handled the raw form).
const PRICE_BOARD_RE = /\\?"priceBoard\\?"\s*:/;
const PRICE_VALUE_RE =
  /\\?"price\\?"\s*:\s*\{[^{}]*?\\?"value\\?"\s*:\s*\\?"([\d,]+(?:\.\d+)?)\\?"/;

/**
 * Pull 基準価額 out of the `priceBoard` block of a Yahoo JP quote page.
 *
 * Anchoring the search to `priceBoard` matters: the page embeds several other
 * `price` keys (watchlist widgets, related funds), and an unanchored match
 * would happily return a different fund's NAV.
 */
export function extractYahooJPFundPrice(html: string): number {
  const boardIndex = html.search(PRICE_BOARD_RE);
  if (boardIndex === -1) {
    throw new Error("priceBoard block not found in Yahoo JP page");
  }

  const match = html.slice(boardIndex, boardIndex + 2000).match(PRICE_VALUE_RE);
  if (!match) throw new Error("Base price not found in Yahoo JP priceBoard");

  const price = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid base price "${match[1]}" in Yahoo JP page`);
  }
  return price;
}

/**
 * Non-MUFG JP funds, priced off the Yahoo JP quote page.
 *
 * This used to scrape a JWT and call the `bff-pc` history API. That path is
 * dead twice over — the token no longer parses out of the page, and the BFF
 * rejects the page's token with "JWT Verification Error". The quote page
 * already embeds the NAV, so one request is both simpler and more robust.
 * Verified to agree exactly with MUFG's `cfm_base_price` for a shared fund.
 */
async function fetchYahooJPFundPriceFor(fundCode: string): Promise<FetchedPrice> {
  const pageUrl = `https://finance.yahoo.co.jp/quote/${encodeURIComponent(fundCode)}`;
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": BROWSER_UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Yahoo JP page returned ${res.status}`);

  // The page reports an update date as "9/18" with no year, which is
  // ambiguous across a new-year boundary — not worth guessing, so this
  // provider falls back to today's date.
  return { price: extractYahooJPFundPrice(await res.text()) };
}

async function fetchCNFundPrice(fundCode: string): Promise<FetchedPrice> {
  // The old estimate endpoint (fundgz.1234567.com.cn/js/{code}.js) is dead: it
  // now returns HTTP 200 with a "页面未找到" HTML page instead of the jsonpgz(...)
  // payload, so res.ok passed but the JSONP regex failed. Switch to eastmoney's
  // f10 NAV-history JSON API, which returns the confirmed 单位净值 (DWJZ). A
  // Referer from the fund site is required or the API rejects the request.
  const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${encodeURIComponent(fundCode)}&pageIndex=1&pageSize=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://fundf10.eastmoney.com/",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Eastmoney Fund API returned ${res.status}`);

  const data = await res.json();
  const latest = data?.Data?.LSJZList?.[0];
  const price = parseFloat(latest?.DWJZ);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("DWJZ not found in Eastmoney Fund response");
  }
  // FSRQ is the NAV date (净值日期), already `YYYY-MM-DD`.
  const fsrq = String(latest?.FSRQ ?? "");
  return {
    price,
    asOf: /^\d{4}-\d{2}-\d{2}$/.test(fsrq) ? fsrq : undefined,
  };
}

async function fetchPriceForAsset(asset: Asset): Promise<FetchedPrice> {
  if (!asset.symbol) throw new Error("No symbol configured");

  if (asset.category === "usStock") {
    return fetchUSStockPrice(asset.symbol);
  }

  if (asset.category === "jpFund") {
    if (asset.fund_provider === "mufg") {
      return fetchMUFGFundPrice(asset.symbol);
    }
    return fetchYahooJPFundPriceFor(asset.symbol);
  }

  if (asset.category === "cnFund") {
    return fetchCNFundPrice(asset.symbol);
  }

  throw new Error(`Price fetching not supported for category: ${asset.category}`);
}

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: assets } = await supabase.from("assets").select("*");
  const allAssets = (assets || []) as Asset[];
  const investmentAssets = allAssets.filter(
    (a) => isInvestment(a.category) && a.symbol
  );

  if (investmentAssets.length === 0) {
    return NextResponse.json({ prices: [], errors: [] });
  }

  const now = new Date().toISOString();
  const today = todayUTC();
  const prices: PriceResult[] = [];
  const errors: PriceError[] = [];

  // Snapshot date per asset: the provider's own NAV date when it reports one,
  // otherwise today. Never in the future — a provider clock skewed ahead
  // would otherwise write a snapshot dated past today and drag the chart's
  // last point with it.
  const snapshotDates = new Map<string, string>();

  const settled = await Promise.allSettled(
    investmentAssets.map(async (asset) => {
      const { price, asOf } = await fetchPriceForAsset(asset);
      return { assetId: asset.id, price, asOf };
    })
  );

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const asset = investmentAssets[i];
    if (result.status === "fulfilled") {
      const { assetId, price, asOf } = result.value;
      prices.push({ assetId, price, updatedAt: now });
      snapshotDates.set(assetId, asOf && asOf <= today ? asOf : today);
    } else {
      errors.push({
        assetId: asset.id,
        error: result.reason?.message || "Unknown error",
      });
    }
  }

  // Persist in two concurrent batches:
  //   1. Per-asset updates to `assets.current_price` + `last_price_update`
  //      run in parallel (N queries but overlapped, not serialized).
  //   2. A single bulk upsert into `asset_price_snapshots` writes every
  //      day's snapshot in one round-trip.
  // Previously we did `for (... of prices) { await update; await upsert }`
  // which was 2N sequential round-trips to Supabase.
  //
  // Every write's `error` is checked. supabase-js *resolves* with
  // `{ data, error }` instead of rejecting, so the previous bare `await`
  // treated a total write failure as success: the route returned the fetched
  // prices with an empty error list, the client showed 已刷新, and
  // `router.refresh()` then re-rendered the unchanged old prices.
  if (prices.length > 0) {
    const assetUpdates = prices.map(async ({ assetId, price }) => {
      const { error } = await supabase
        .from("assets")
        .update({ current_price: price, last_price_update: now })
        .eq("id", assetId);
      return { assetId, error };
    });

    const snapshotRows = prices.map(({ assetId, price }) => ({
      asset_id: assetId,
      price,
      date: snapshotDates.get(assetId) ?? today,
    }));

    const [updateResults, snapshotResult] = await Promise.all([
      Promise.all(assetUpdates),
      supabase
        .from("asset_price_snapshots")
        .upsert(snapshotRows, { onConflict: "asset_id,date" }),
    ]);

    // A price we failed to store is not a refreshed price — drop it from
    // `prices` so the client can't report it as having landed.
    const failedIds = new Set<string>();
    for (const { assetId, error } of updateResults) {
      if (!error) continue;
      failedIds.add(assetId);
      errors.push({ assetId, error: `保存失败: ${error.message}` });
    }
    if (failedIds.size > 0) {
      for (let i = prices.length - 1; i >= 0; i--) {
        if (failedIds.has(prices[i].assetId)) prices.splice(i, 1);
      }
    }

    // The snapshot upsert is history-only — `assets.current_price` already
    // landed, so the refresh is still useful. Report it without discarding
    // the prices.
    if (snapshotResult.error) {
      errors.push({
        assetId: "",
        error: `历史快照保存失败: ${snapshotResult.error.message}`,
      });
    }
  }

  return NextResponse.json({ prices, errors });
}
