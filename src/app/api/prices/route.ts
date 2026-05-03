import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Asset } from "@/lib/types";

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
  const price = data?.base_price;
  if (typeof price !== "number" && typeof price !== "string") {
    throw new Error("Price not found in MUFG response");
  }
  return Number(price);
}

async function fetchYahooJPToken(fundCode: string): Promise<string> {
  const pageUrl = `https://finance.yahoo.co.jp/quote/${encodeURIComponent(fundCode)}`;
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Yahoo JP page returned ${res.status}`);

  const html = await res.text();
  const tokenMatch = html.match(/"crumb":"([^"]+)"/);
  if (!tokenMatch) throw new Error("Could not extract crumb token from Yahoo JP");
  return tokenMatch[1];
}

async function fetchRakutenFundPrice(fundCode: string): Promise<number> {
  const crumb = await fetchYahooJPToken(fundCode);
  const url = `https://query1.finance.yahoo.co.jp/v8/finance/chart/${encodeURIComponent(fundCode)}?range=1d&interval=1d&crumb=${encodeURIComponent(crumb)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Yahoo JP API returned ${res.status}`);

  const data = await res.json();
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number") throw new Error("Price not found in Yahoo JP response");
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
  const investmentAssets = ((assets || []) as Asset[]).filter(
    (a) => (a.category === "usStock" || a.category === "jpFund") && a.symbol
  );

  if (investmentAssets.length === 0) {
    return NextResponse.json({ prices: [], errors: [] });
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
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

  for (const { assetId, price } of prices) {
    await supabase
      .from("assets")
      .update({ current_price: price, last_price_update: now })
      .eq("id", assetId);

    await supabase
      .from("asset_price_snapshots")
      .upsert(
        { asset_id: assetId, price, date: today },
        { onConflict: "asset_id,date" }
      );
  }

  return NextResponse.json({ prices, errors });
}
