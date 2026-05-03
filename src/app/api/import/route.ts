import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ImportPayload {
  version: string;
  assets: Array<Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
  priceSnapshots: Array<Record<string, unknown>>;
  exchangeRateSnapshots: Array<Record<string, unknown>>;
}

function validatePayload(data: unknown): data is ImportPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.version === "string" &&
    Array.isArray(d.assets) &&
    Array.isArray(d.transactions) &&
    Array.isArray(d.priceSnapshots) &&
    Array.isArray(d.exchangeRateSnapshots)
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get("mode") || "merge";
  if (mode !== "merge" && mode !== "replace") {
    return NextResponse.json(
      { error: "Invalid mode. Use 'merge' or 'replace'." },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!validatePayload(payload)) {
    return NextResponse.json(
      { error: "Invalid data format. Expected version, assets, transactions, priceSnapshots, exchangeRateSnapshots." },
      { status: 400 }
    );
  }

  const counts = { assets: 0, transactions: 0, priceSnapshots: 0, exchangeRateSnapshots: 0 };

  if (mode === "replace") {
    await supabase.from("exchange_rate_snapshots").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("asset_price_snapshots").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("assets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  if (payload.assets.length > 0) {
    const { data } = await supabase
      .from("assets")
      .upsert(payload.assets, { onConflict: "id" })
      .select("id");
    counts.assets = data?.length || 0;
  }

  if (payload.transactions.length > 0) {
    const { data } = await supabase
      .from("transactions")
      .upsert(payload.transactions, { onConflict: "id" })
      .select("id");
    counts.transactions = data?.length || 0;
  }

  if (payload.priceSnapshots.length > 0) {
    const { data } = await supabase
      .from("asset_price_snapshots")
      .upsert(payload.priceSnapshots, { onConflict: "id" })
      .select("id");
    counts.priceSnapshots = data?.length || 0;
  }

  if (payload.exchangeRateSnapshots.length > 0) {
    const { data } = await supabase
      .from("exchange_rate_snapshots")
      .upsert(payload.exchangeRateSnapshots, { onConflict: "id" })
      .select("id");
    counts.exchangeRateSnapshots = data?.length || 0;
  }

  return NextResponse.json({ success: true, mode, counts });
}
