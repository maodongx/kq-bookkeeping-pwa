import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Currency } from "@/lib/types";
import { todayUTC } from "@/lib/date";

const CURRENCIES: Currency[] = ["USD", "JPY", "CNY"];

interface ExternalRateResponse {
  result: string;
  rates: Record<string, number>;
}

// Matches the prices route: a hung upstream must not hold the serverless
// function open until the platform kills it, because `refreshAllPrices`
// Promise.all's both routes and would hang behind this one.
const FETCH_TIMEOUT_MS = 8_000;

async function fetchRatesForBase(base: Currency): Promise<Record<Currency, number>> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Exchange rate API error for ${base}: ${res.status}`);

  const data: ExternalRateResponse = await res.json();
  if (data.result !== "success") throw new Error(`Exchange rate API returned: ${data.result}`);

  const rates: Record<string, number> = {};
  for (const target of CURRENCIES) {
    if (target === base) continue;
    const rate = Number(data.rates?.[target]);
    // Drop anything non-numeric rather than letting `undefined` through. A
    // row with a missing `rate` key makes PostgREST reject the whole bulk
    // upsert ("All object keys must match"), which would lose the other
    // currencies' rates for the day too.
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Exchange rate API omitted ${base}->${target}`);
    }
    rates[target] = rate;
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

  const today = todayUTC();
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

    // supabase-js resolves with `{ error }` rather than rejecting, so an
    // unchecked await here reported a total write failure as success.
    const { error } = await supabase
      .from("exchange_rate_snapshots")
      .upsert(rows, { onConflict: "base_currency,target_currency,date" });
    if (error) errors.push(`汇率保存失败: ${error.message}`);
  }

  const rateMap: Record<string, Record<string, number>> = {};
  for (const { base, target, rate } of results) {
    if (!rateMap[base]) rateMap[base] = {};
    rateMap[base][target] = rate;
  }

  return NextResponse.json({ rates: rateMap, errors });
}
