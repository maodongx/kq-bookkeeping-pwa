import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { computeHolding } from "@/lib/asset-calculations";
import type { Asset, AssetCategory, Transaction } from "@/lib/types";

/**
 * Re-read an asset's balance from the database, right now.
 *
 * `adjustment` transactions store a *delta*, but the user types a target
 * balance — so the delta is only correct if it's computed against the balance
 * that is actually current at submit time. The balance passed into the form
 * comes from the page render, and this is a shared-household app with a 30s
 * router cache (`staleTimes.dynamic`), so that number can easily be stale by
 * the time the form is submitted.
 *
 * Concretely: the balance is ¥900,000 when one person's page renders, the other
 * person deposits ¥100,000, then the first person reads ¥1,000,000 off their
 * bank statement and enters it. Against the stale ¥900,000 the delta is
 * +¥100,000, which applied to the real ¥1,000,000 leaves ¥1,100,000 — the
 * balance is silently ¥100,000 wrong, and nothing in the UI hints at it.
 *
 * Returns `null` if the read fails, so the caller can abort rather than write a
 * delta against a number it can't trust.
 */
export async function fetchLiveBalance(
  assetId: string,
  category: AssetCategory
): Promise<number | null> {
  const supabase = createClient();

  const { rows, error } = await fetchAllRows<Transaction>((from, to) =>
    supabase
      .from("transactions")
      .select("*")
      .eq("asset_id", assetId)
      .range(from, to)
  );
  if (error) return null;

  // `computeHolding` only reads id, category, and current_price. Balance for
  // the non-investment categories this is used by never consults a price, so a
  // minimal stand-in is enough and avoids a second round-trip for the asset row.
  const asset = {
    id: assetId,
    category,
    current_price: null,
  } as Asset;

  return computeHolding(asset, rows).balance;
}
