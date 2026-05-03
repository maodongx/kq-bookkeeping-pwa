import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Currency } from "@/lib/types";

const CURRENCIES: Currency[] = ["USD", "JPY", "CNY"];

interface ExternalRateResponse {
  result: string;
  rates: Record<string, number>;
}

async function fetchRatesForBase(base: Currency): Promise<Record<Currency, number>> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error(`Exchange rate API error for ${base}: ${res.status}`);

  const data: ExternalRateResponse = await res.json();
  if (data.result !== "success") throw new Error(`Exchange rate API returned: ${data.result}`);

  const rates: Record<string, number> = {};
  for (const target of CURRENCIES) {
    if (target === base) continue;
    rates[target] = data.rates[target];
  }
  return rates as Record<Currency, number>;
}

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const results: Array<{ base: Currency; target: Currency; rate: number }> = [];
  const errors: string[] = [];

  const settled = await Promise.allSettled(
    CURRENCIES.map(async (base) => {
      const rates = await fetchRatesForBase(base);
      return { base, rates };
    })
  );

  for (const result of settled) {
    if (result.status === "fulfilled") {
      const { base, rates } = result.value;
      for (const [target, rate] of Object.entries(rates)) {
        results.push({ base, target: target as Currency, rate });
      }
    } else {
      errors.push(result.reason?.message || "Unknown error");
    }
  }

  if (results.length > 0) {
    const rows = results.map(({ base, target, rate }) => ({
      base_currency: base,
      target_currency: target,
      rate,
      date: today,
    }));

    await supabase
      .from("exchange_rate_snapshots")
      .upsert(rows, { onConflict: "base_currency,target_currency,date" });
  }

  const rateMap: Record<string, Record<string, number>> = {};
  for (const { base, target, rate } of results) {
    if (!rateMap[base]) rateMap[base] = {};
    rateMap[base][target] = rate;
  }

  return NextResponse.json({ rates: rateMap, errors });
}
