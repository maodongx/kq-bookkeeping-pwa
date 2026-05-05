"use client";

import { AlertTriangle } from "lucide-react";
import { Card, ProgressBar } from "@heroui/react";
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_FALLBACK,
} from "@/lib/bookkeeping-data";
import type { CategorySpendingSummary } from "@/lib/bookkeeping-types";

interface CategoryBreakdownProps {
  summaries: CategorySpendingSummary[];
  onCategoryTap?: (categoryId: string) => void;
}

/**
 * Per-category spending cards for the analytics page. Sorted by amount
 * descending so the biggest line items are immediately visible. A warning
 * icon + orange progress bar surface "projected overspend" from the
 * pace-based check in `calculateBudgetWarning`.
 */
export function CategoryBreakdown({
  summaries,
  onCategoryTap,
}: CategoryBreakdownProps) {
  const sorted = [...summaries].sort((a, b) => b.totalSpent - a.totalSpent);
  const total = sorted.reduce((sum, s) => sum + s.totalSpent, 0);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((summary) => {
        const IconComponent =
          CATEGORY_ICONS[summary.category.icon] ?? CATEGORY_ICON_FALLBACK;
        const percentage = total > 0 ? (summary.totalSpent / total) * 100 : 0;
        const content = (
          <Card.Content className="flex flex-col gap-2 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                <IconComponent size={20} className="text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium">
                    {summary.category.name}
                  </span>
                  <div className="flex items-center gap-1">
                    {summary.projectedOverspend && (
                      <AlertTriangle size={16} className="text-warning" />
                    )}
                    <span className="font-semibold">
                      ¥{summary.totalSpent.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-muted">
                  {percentage.toFixed(1)}%
                </span>
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
          </Card.Content>
        );

        if (onCategoryTap) {
          return (
            <button
              key={summary.category.id}
              type="button"
              onClick={() => onCategoryTap(summary.category.id)}
              className="w-full text-left transition-transform active:scale-[0.99]"
            >
              <Card>{content}</Card>
            </button>
          );
        }
        return <Card key={summary.category.id}>{content}</Card>;
      })}
    </div>
  );
}
