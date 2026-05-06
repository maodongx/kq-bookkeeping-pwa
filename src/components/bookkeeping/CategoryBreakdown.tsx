"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { Accordion, ProgressBar } from "@heroui/react";
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_FALLBACK,
} from "@/lib/bookkeeping-data";
import { formatCurrency } from "@/lib/currency";
import { convertCurrency, type RateMap } from "@/lib/exchange-rates";
import type { Currency } from "@/lib/types";
import type {
  CategorySpendingSummary,
  SpendingTransaction,
} from "@/lib/bookkeeping-types";

interface CategoryBreakdownProps {
  summaries: CategorySpendingSummary[];
  transactions: SpendingTransaction[];
  /** User's default currency — all amounts are displayed in it. */
  displayCurrency: Currency;
  /** Latest rate snapshot, keyed by (base, target). */
  rates: RateMap;
  /** Fires when the 修改预算 link is tapped for a category header. */
  onEditBudget: (categoryId: string) => void;
  /** Fires when an individual transaction row is tapped. */
  onEditTx: (tx: SpendingTransaction) => void;
}

/**
 * Per-category accordion: header shows the rollup (total + remaining-
 * budget % + optional progress bar), expanding reveals every transaction
 * in that category sorted by date desc plus a "修改预算" link at the top.
 * Mirrors the drill-down pattern used on the assets tab.
 *
 * All numeric values flow through `convertCurrency` into
 * `displayCurrency` before rendering — the source rows may be in JPY,
 * USD, or CNY individually, but the screen always shows one consistent
 * currency.
 */
export function CategoryBreakdown({
  summaries,
  transactions,
  displayCurrency,
  rates,
  onEditBudget,
  onEditTx,
}: CategoryBreakdownProps) {
  const sorted = [...summaries].sort((a, b) => b.totalSpent - a.totalSpent);

  // Group transactions by category once and sort each group date desc.
  const txByCategory = new Map<string, SpendingTransaction[]>();
  for (const tx of transactions) {
    const arr = txByCategory.get(tx.categoryId) ?? [];
    arr.push(tx);
    txByCategory.set(tx.categoryId, arr);
  }
  for (const arr of txByCategory.values()) {
    arr.sort((a, b) => b.date.localeCompare(a.date));
  }

  return (
    <Accordion variant="surface">
      {sorted.map((summary) => {
        const IconComponent =
          CATEGORY_ICONS[summary.category.icon] ?? CATEGORY_ICON_FALLBACK;
        const txs = txByCategory.get(summary.category.id) ?? [];
        // Budget-relative percentage: how much of the monthly allowance is
        // left for this category. Null when no budget is set; positive
        // "剩余 X%" when under, "超支 X%" when over.
        const budgetLabel = budgetRelativeLabel(summary.percentUsed);
        return (
          <Accordion.Item key={summary.category.id} id={summary.category.id}>
            <Accordion.Heading>
              <Accordion.Trigger>
                <div className="flex w-full flex-col gap-2 pr-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                      <IconComponent size={18} className="text-accent" />
                    </div>
                    <span className="flex-1 truncate text-left text-sm font-semibold text-foreground">
                      {summary.category.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {summary.projectedOverspend && (
                        <AlertTriangle size={14} className="text-warning" />
                      )}
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(summary.totalSpent, displayCurrency)}
                      </span>
                      {budgetLabel && (
                        <span
                          className={`ml-1 text-xs font-normal ${
                            budgetLabel.overBudget
                              ? "text-warning"
                              : "text-muted"
                          }`}
                        >
                          ({budgetLabel.text})
                        </span>
                      )}
                    </div>
                  </div>
                  {summary.budget !== null && summary.percentUsed !== null && (
                    <ProgressBar
                      size="sm"
                      value={Math.min(summary.percentUsed, 100)}
                      color={summary.projectedOverspend ? "warning" : "accent"}
                      aria-label={`${summary.category.name} budget usage`}
                    />
                  )}
                </div>
                <Accordion.Indicator>
                  <ChevronDown />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="p-0">
                {/* Budget row + edit link — budget shown in display currency */}
                <div className="flex items-center justify-between gap-3 border-b border-separator px-3 py-2 text-xs">
                  <span className="text-muted">
                    {summary.budget !== null
                      ? `${summary.budgetType === "annual" ? "年度预算" : "预算"} ${formatCurrency(summary.budget, displayCurrency)}`
                      : "未设预算"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditBudget(summary.category.id)}
                    className="text-accent transition-transform active:scale-95"
                  >
                    修改预算
                  </button>
                </div>

                {/* Transactions — tap to edit. Each amount is converted to
                    displayCurrency from the row's native currency. */}
                {txs.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted">
                    本月暂无记录
                  </p>
                ) : (
                  <ul className="divide-y divide-separator">
                    {txs.map((tx) => {
                      const converted = convertCurrency(
                        tx.amount,
                        tx.currency,
                        displayCurrency,
                        rates
                      );
                      return (
                        <li key={tx.id}>
                          <button
                            type="button"
                            onClick={() => onEditTx(tx)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-default active:bg-default"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-foreground">
                                {tx.notes || (
                                  <span className="text-muted">—</span>
                                )}
                              </p>
                              <p className="text-xs text-muted">{tx.date}</p>
                            </div>
                            <span className="shrink-0 text-sm font-medium tabular-nums">
                              {formatCurrency(converted, displayCurrency)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}

/**
 * Given percentUsed (0-100 typically, can exceed 100 when over budget),
 * produce the label shown next to a category's total in the header.
 *   - Null percentUsed → null (no budget set, nothing to show)
 *   - 0-100 → "剩余 X%" (under budget: X = 100 - percentUsed)
 *   - >100  → "超支 X%" (over budget:  X = percentUsed - 100)
 * `overBudget` is returned separately so the caller can color the span.
 */
function budgetRelativeLabel(
  percentUsed: number | null
): { text: string; overBudget: boolean } | null {
  if (percentUsed == null) return null;
  if (percentUsed > 100) {
    return {
      text: `超支 ${(percentUsed - 100).toFixed(1)}%`,
      overBudget: true,
    };
  }
  return {
    text: `剩余 ${(100 - percentUsed).toFixed(1)}%`,
    overBudget: false,
  };
}
