import { Asset, Transaction } from "./types";
import { hasPerAssetGainLoss, isInvestment } from "./currency";

export interface Holding {
  /**
   * For investments: total shares/units held.
   * For deposits: total quantity (redundant with balance but kept for symmetry).
   */
  totalQty: number;
  /**
   * Cost basis used by the buy-sell model. Sum of buy amounts minus sum of
   * sell amounts. Zero for non-buy-sell categories (deposits, mmf, managed) —
   * those use `balance - capital` instead, see `gainLoss` below.
   */
  totalCost: number;
  /**
   * Running balance. Sum of deposits + adjustments − withdrawals (and cash
   * flows from buy/sell too, though for investments callers typically read
   * `marketValue` instead).
   */
  balance: number;
  /**
   * Current market value.
   *   Investments: totalQty * asset.current_price (or 0 if no price known).
   *   Deposits and mmf/managed: balance.
   */
  marketValue: number;
  /**
   * Unrealized gain/loss in the asset's native currency.
   *   Investments (buy-sell model): marketValue − totalCost.
   *   mmf / managed (balance model): balance − net capital flows (deposits −
   *     withdrawals), so adjustment transactions — which represent NAV
   *     updates or interest — accrue cleanly as gain.
   *   bankDeposit / cash / other: 0 (no per-asset gain concept today).
   */
  gainLoss: number;
  /** Gain/loss as a percentage of the relevant cost basis. */
  gainPct: number;
}

/**
 * Compute a snapshot of an asset's position from its transaction history.
 *
 * This is the single source of truth for holding math. Two parallel
 * accumulators are tracked in one pass:
 *   - `totalCost` (buy-sell cost basis) — used by classic investments.
 *   - `capital`   (deposits − withdrawals) — used by mmf/managed and by the
 *     cross-asset dashboard math.
 * The correct one is picked at the end based on the category.
 *
 * All pages and the gain/loss bar chart call this — do not inline reducers.
 */
export function computeHolding(asset: Asset, transactions: Transaction[]): Holding {
  const txs = transactions.filter((tx) => tx.asset_id === asset.id);
  const inv = isInvestment(asset.category);

  let totalQty = 0;
  let totalCost = 0;
  let balance = 0;
  let capital = 0;

  for (const tx of txs) {
    switch (tx.type) {
      case "buy":
        totalQty += tx.quantity;
        totalCost += tx.amount;
        balance += tx.amount;
        break;
      case "sell":
        totalQty -= tx.quantity;
        totalCost -= tx.amount;
        balance -= tx.amount;
        break;
      case "deposit":
        totalQty += tx.quantity;
        balance += tx.amount;
        capital += tx.amount;
        break;
      case "withdraw":
        totalQty -= tx.quantity;
        balance -= tx.amount;
        capital -= tx.amount;
        break;
      case "adjustment":
        // Adjustments add signed deltas to quantity and balance but do NOT
        // touch capital — they represent market effects (interest, NAV
        // updates, reconciliations), not money the user put in or took out.
        totalQty += tx.quantity;
        balance += tx.amount;
        break;
    }
  }

  const marketValue =
    inv && asset.current_price ? totalQty * asset.current_price : balance;

  let gainLoss = 0;
  let costBasisForPct = 0;
  if (inv) {
    gainLoss = marketValue - totalCost;
    costBasisForPct = totalCost;
  } else if (hasPerAssetGainLoss(asset.category)) {
    // mmf / managed — gain = balance minus net capital you committed.
    gainLoss = balance - capital;
    costBasisForPct = capital;
  }
  const gainPct = costBasisForPct > 0 ? (gainLoss / costBasisForPct) * 100 : 0;

  return { totalQty, totalCost, balance, marketValue, gainLoss, gainPct };
}
