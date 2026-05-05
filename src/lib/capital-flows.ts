import { Asset, Currency, Transaction } from "./types";
import { RateMap, convertCurrency } from "./exchange-rates";

/**
 * Net capital flow across all tracked assets in a (from, to] window,
 * expressed in the target currency. Signed — positive means money the
 * user put in, negative means money taken out.
 *
 * Transaction semantics:
 *   buy       →  capital in  (+amount)
 *   deposit   →  capital in  (+amount)
 *   sell      →  capital out (-amount)
 *   withdraw  →  capital out (-amount)
 *   adjustment → NOT capital; treated as a market effect (bank interest,
 *                reconciliation) so it never enters this sum. This is the
 *                convention the dashboard's "累计盈亏" math relies on.
 *
 * Each transaction's amount lives in its asset's native currency, so we
 * convert every row into `targetCurrency` using today's rate map. This
 * matches how `totalCost` was historically aggregated on the dashboard
 * and keeps the whole picture self-consistent with `netWorth`.
 *
 * Both bounds are optional. Omit `from` for "since the beginning of
 * time", omit `to` for "up to now". Both are treated inclusively against
 * transaction `date` strings (YYYY-MM-DD).
 */
export function capitalFlowsBetween(
  transactions: Transaction[],
  assets: Asset[],
  targetCurrency: Currency,
  rates: RateMap,
  from?: string,
  to?: string
): number {
  const assetCurrency = new Map<string, Currency>(
    assets.map((a) => [a.id, a.currency])
  );

  let total = 0;
  for (const tx of transactions) {
    if (from && tx.date < from) continue;
    if (to && tx.date > to) continue;

    const nativeCurrency = assetCurrency.get(tx.asset_id);
    if (!nativeCurrency) continue; // orphan transaction — skip defensively

    let signed: number;
    switch (tx.type) {
      case "buy":
      case "deposit":
        signed = tx.amount;
        break;
      case "sell":
      case "withdraw":
        signed = -tx.amount;
        break;
      case "adjustment":
        // Market effect, not capital movement — skip entirely.
        continue;
    }

    total += convertCurrency(signed, nativeCurrency, targetCurrency, rates);
  }
  return total;
}
