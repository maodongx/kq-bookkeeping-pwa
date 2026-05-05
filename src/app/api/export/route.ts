import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayUTC } from "@/lib/date";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    { data: assets },
    { data: transactions },
    { data: priceSnapshots },
    { data: exchangeRateSnapshots },
  ] = await Promise.all([
    supabase.from("assets").select("*").order("created_at"),
    supabase.from("transactions").select("*").order("date"),
    supabase.from("asset_price_snapshots").select("*").order("date"),
    supabase.from("exchange_rate_snapshots").select("*").order("date"),
  ]);

  const payload = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    assets: assets || [],
    transactions: transactions || [],
    priceSnapshots: priceSnapshots || [],
    exchangeRateSnapshots: exchangeRateSnapshots || [],
  };

  const today = todayUTC();

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="kq-bookkeeping-export-${today}.json"`,
    },
  });
}
