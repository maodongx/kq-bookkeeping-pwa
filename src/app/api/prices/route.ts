import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Asset } from "@/lib/types";
import { todayUTC, todayTokyoCompact } from "@/lib/date";

interface PriceResult {
  assetId: string;
  price: number;
  updatedAt: string;
}

interface PriceError {
  assetId: string;
  error: string;
}

async function fetchUSStockPrice(symbol: string): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);

  const data = await res.json();
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number") throw new Error("Price not found in response");
  return price;
}

async function fetchMUFGFundPrice(fundCode: string): Promise<number> {
  const url = `https://www.am.mufg.jp/mukamapi/fund_details/?fund_cd=${encodeURIComponent(fundCode)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`MUFG API returned ${res.status}`);

  const data = await res.json();
  const price = data?.datasets?.cfm_base_price;
  if (typeof price !== "number" && typeof price !== "string") {
    throw new Error("Price not found in MUFG response");
  }
  return Number(price);
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchYahooJPToken(fundCode: string): Promise<string> {
  const pageUrl = `https://finance.yahoo.co.jp/quote/${encodeURIComponent(fundCode)}`;
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": BROWSER_UA },
  });
  if (!res.ok) throw new Error(`Yahoo JP page returned ${res.status}`);

  const html = await res.text();
  const tokenMatch = html.match(/"jwtToken":"([^"]+)"/);
  if (!tokenMatch) throw new Error("Could not extract JWT token from Yahoo JP");
  return tokenMatch[1];
}

async function fetchRakutenFundPrice(fundCode: string): Promise<number> {
  const jwt = await fetchYahooJPToken(fundCode);
  const today = todayTokyoCompact();
  const url = `https://finance.yahoo.co.jp/bff-pc/v1/main/fund/chart/history/${encodeURIComponent(fundCode)}?fromDate=&size=2&timeFrame=daily&toDate=${today}`;
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, "jwt-token": jwt },
  });
  if (!res.ok) throw new Error(`Yahoo JP BFF API returned ${res.status}`);

  const data = await res.json();
  const histories = data?.priceHistories;
  if (!Array.isArray(histories) || histories.length === 0) {
    throw new Error("No price histories in Yahoo JP response");
  }
  const latest = histories[histories.length - 1];
  const price = latest?.closePrice;
  if (typeof price !== "number") throw new Error("closePrice not found in Yahoo JP response");
  return price;
}

async function fetchCNFundPrice(fundCode: string): Promise<number> {
  const today = todayUTC().replace(/-/g, "");
  const url = `https://fundgz.1234567.com.cn/js/${encodeURIComponent(fundCode)}.js?rt=${today}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Tiantian Fund API returned ${res.status}`);

  const text = await res.text();
  const match = text.match(/jsonpgz\((.+)\)/);
  if (!match) throw new Error("Could not parse JSONP response from Tiantian Fund");

  const data = JSON.parse(match[1]);
  const price = parseFloat(data?.dwjz);
  if (isNaN(price)) throw new Error("dwjz not found in Tiantian Fund response");
  return price;
}

async function fetchPriceForAsset(asset: Asset): Promise<number> {
  if (!asset.symbol) throw new Error("No symbol configured");

  if (asset.category === "usStock") {
    return fetchUSStockPrice(asset.symbol);
  }

  if (asset.category === "jpFund") {
    if (asset.fund_provider === "mufg") {
      return fetchMUFGFundPrice(asset.symbol);
    }
    return fetchRakutenFundPrice(asset.symbol);
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
    (a) => (a.category === "usStock" || a.category === "jpFund" || a.category === "cnFund") && a.symbol
  );

  if (investmentAssets.length === 0) {
    return NextResponse.json({ prices: [], errors: [] });
  }

  const now = new Date().toISOString();
  const today = todayUTC();
  const prices: PriceResult[] = [];
  const errors: PriceError[] = [];

  const settled = await Promise.allSettled(
    investmentAssets.map(async (asset) => {
      const price = await fetchPriceForAsset(asset);
      return { assetId: asset.id, price };
    })
  );

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const asset = investmentAssets[i];
    if (result.status === "fulfilled") {
      prices.push({ ...result.value, updatedAt: now });
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
  if (prices.length > 0) {
    const assetUpdates = prices.map(({ assetId, price }) =>
      supabase
        .from("assets")
        .update({ current_price: price, last_price_update: now })
        .eq("id", assetId)
    );

    const snapshotRows = prices.map(({ assetId, price }) => ({
      asset_id: assetId,
      price,
      date: today,
    }));

    await Promise.all([
      Promise.all(assetUpdates),
      supabase
        .from("asset_price_snapshots")
        .upsert(snapshotRows, { onConflict: "asset_id,date" }),
    ]);
  }

  return NextResponse.json({ prices, errors });
}
