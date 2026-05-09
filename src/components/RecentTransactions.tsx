import Link from "next/link";
import { Card } from "@heroui/react";
import {
  formatCurrency,
  gainLossTextClass,
  TX_TYPE_LABELS,
} from "@/lib/currency";
import type { Asset, Transaction } from "@/lib/types";

interface RecentTransactionsProps {
  /** Full asset list — used to look up names/symbols for each tx row. */
  assets: Asset[];
  /** Full transaction list; this component filters + sorts internally. */
  transactions: Transaction[];
  /** How many rows to render. Defaults to 10. */
  limit?: number;
}

/**
 * "最近交易" card for the assets page: the most recent investment-side
 * transactions across 美股 / 日本基金 / 中国基金 (the buy/sell
 * categories). Deposits, withdrawals, and adjustments on bank/mmf/cash
 * accounts are intentionally excluded — this section is for "what did I
 * just trade", not "what did I move between accounts".
 *
 * Rows are tappable and deep-link to the asset detail page so the user
 * can jump into the full history or edit the transaction in context.
 */
export function RecentTransactions({
  assets,
  transactions,
  limit = 10,
}: RecentTransactionsProps) {
  const investmentCategories = new Set<string>(["usStock", "jpFund", "cnFund"]);
  const assetById = new Map(assets.map((a) => [a.id, a]));

  const recent = transactions
    .filter((tx) => {
      const asset = assetById.get(tx.asset_id);
      return asset ? investmentCategories.has(asset.category) : false;
    })
    // Date (YYYY-MM-DD) desc, then created_at desc as a stable tiebreaker
    // for multiple same-day entries.
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.created_at.localeCompare(a.created_at);
    })
    .slice(0, limit);

  if (recent.length === 0) return null;

  return (
    <Card>
      <Card.Header>
        <Card.Title>最近交易</Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        <ul className="divide-y divide-separator">
          {recent.map((tx) => {
            const asset = assetById.get(tx.asset_id);
            if (!asset) return null;
            const isBuy = tx.type === "buy";
            const signedAmount = isBuy ? tx.amount : -tx.amount;
            return (
              <li key={tx.id}>
                <Link
                  href={`/assets/${asset.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-default active:bg-default"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      <span
                        className={
                          isBuy ? gainLossTextClass(1) : gainLossTextClass(-1)
                        }
                      >
                        {TX_TYPE_LABELS[tx.type]}
                      </span>
                      <span className="ml-2">{asset.name}</span>
                    </p>
                    <p className="truncate text-xs text-muted tabular-nums">
                      {tx.date} · {tx.quantity} × {formatCurrency(tx.price, asset.currency)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {formatCurrency(signedAmount, asset.currency)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card.Content>
    </Card>
  );
}
