import { Asset, Transaction } from "./types";
import { isInvestment } from "./currency";

export interface Holding {
  /**
   * For investments: total shares/units held.
   * For deposits: total quantity (redundant with balance but kept for symmetry).
   */
  totalQty: number;
  /**
   * Cost basis. Sum of buy amounts minus sum of sell amounts.
   * For deposits (non-investments) this is always 0.
   */
  totalCost: number;
  /**
   * Running balance. For deposits: sum of deposits minus sum of withdrawals
   * (plus adjustments). For investments this is the cash in/out but is not
   * typically consulted — use marketValue instead.
   */
  balance: number;
  /**
   * Current market value.
   *   Investments: totalQty * asset.current_price (or 0 if no price known).
   *   Deposits:    balance.
   */
  marketValue: number;
  /**
   * Unrealized gain/loss in the asset's native currency.
   *   Investments: marketValue - totalCost.
   *   Deposits:    0.
   */
  gainLoss: number;
  /**
   * Gain/loss as a percentage of cost. Zero for deposits or when totalCost <= 0.
   */
  gainPct: number;
}

/**
 * Compute a snapshot of an asset's position from its transaction history.
 * This is the single source of truth for holding math — all pages that show
 * totals, gain/loss, or market value should call this instead of inlining
 * their own reducers. Exactly this shape was previously duplicated in
 * DashboardClient, assets/[id]/page, chart-utils, and elsewhere.
 */
export function computeHolding(asset: Asset, transactions: Transaction[]): Holding {
  const txs = transactions.filter((tx) => tx.asset_id === asset.id);
  const inv = isInvestment(asset.category);

  let totalQty = 0;
  let totalCost = 0;
  let balance = 0;

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
        break;
      case "withdraw":
        totalQty -= tx.quantity;
        balance -= tx.amount;
        break;
      case "adjustment":
        // Adjustments add signed deltas to quantity and balance; cost basis
        // is not affected (they represent reconciliations, not trades).
        totalQty += tx.quantity;
        balance += tx.amount;
        break;
    }
  }

  const marketValue =
    inv && asset.current_price ? totalQty * asset.current_price : balance;
  const gainLoss = inv ? marketValue - totalCost : 0;
  const gainPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  return { totalQty, totalCost, balance, marketValue, gainLoss, gainPct };
}
