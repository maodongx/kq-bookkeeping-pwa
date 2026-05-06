"use client";

import { useEffect, useState } from "react";
import type { Key } from "@heroui/react";
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SpendingLineChart } from "./SpendingLineChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { BudgetSettingsModal } from "./BudgetSettingsModal";
import { BudgetWarningModal, type WarningModalLevel } from "./BudgetWarningModal";
import { QuickEntryModal } from "./QuickEntryModal";
import {
  SPENDING_CATEGORIES,
  calculateBudgetWarning,
  deleteSpendingTransaction,
  getCategoryBudgets,
  getSpendingTransactions,
  PREDICTION_EXCLUDED_CATEGORY_IDS,
  updateSpendingTransaction,
} from "@/lib/bookkeeping-data";
import { monthBoundariesLocal } from "@/lib/date";
import { formatCurrency } from "@/lib/currency";
import { convertCurrency, type RateMap } from "@/lib/exchange-rates";
import type { Currency } from "@/lib/types";
import type {
  CategoryBudget,
  CategorySpendingSummary,
  SpendingCategory,
  SpendingTransaction,
} from "@/lib/bookkeeping-types";

/**
 * The analytics page has two views:
 *   - "monthly": pick a month; headers show that month's spending; monthly
 *     budgets get a "月度预算 X (剩余 Y%)" line in the expanded view.
 *   - "annual": pick a year; headers show the year's spending; annual
 *     budgets get a "年度预算 X (剩余 Y%)" line in the expanded view.
 */
export type ViewMode = "monthly" | "annual";

/**
 * Sum transaction amounts into the display currency. Each row is
 * converted from its native currency before summing so the total is
 * meaningful when the rows mix JPY / USD / CNY.
 */
function sumInDisplayCurrency(
  transactions: SpendingTransaction[],
  displayCurrency: Currency,
  rates: RateMap
): number {
  let total = 0;
  for (const tx of transactions) {
    total += convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
  }
  return total;
}

/**
 * Turn raw per-currency rows into per-category summaries normalized to
 * `displayCurrency`. The key difference from the previous implementation:
 * every header amount is for the time bucket matching `viewMode`
 * (monthly sum in monthly view, annual sum in annual view), NOT a
 * per-category mix of monthly-vs-annual based on budget type. Budget
 * references are only included when the budget's type matches the view.
 */
function computeSummaries({
  monthlyTransactions,
  annualSpendingMap,
  budgets,
  displayCurrency,
  rates,
  viewMode,
  dayOfMonth,
  daysInMonth,
}: {
  monthlyTransactions: SpendingTransaction[];
  annualSpendingMap: Map<string, number>;
  budgets: CategoryBudget[];
  displayCurrency: Currency;
  rates: RateMap;
  viewMode: ViewMode;
  dayOfMonth: number;
  daysInMonth: number;
}): CategorySpendingSummary[] {
  const budgetMap = new Map(budgets.map((b) => [b.categoryId, b]));

  // Monthly spending map from the selected month's transactions.
  const monthlySpendingMap = new Map<string, number>();
  for (const tx of monthlyTransactions) {
    const converted = convertCurrency(
      tx.amount,
      tx.currency,
      displayCurrency,
      rates
    );
    monthlySpendingMap.set(
      tx.categoryId,
      (monthlySpendingMap.get(tx.categoryId) ?? 0) + converted
    );
  }

  // Pick the right spending map for the view.
  const spendingMap =
    viewMode === "monthly" ? monthlySpendingMap : annualSpendingMap;

  // A category shows up if it has spending in the active time bucket OR
  // has a budget of the active type (so "0 / 60000" bars still appear
  // before the first entry of a period).
  const relevantBudgetIds = new Set<string>(
    Array.from(budgetMap.values())
      .filter((b) =>
        viewMode === "monthly"
          ? b.budgetType === "monthly"
          : b.budgetType === "annual"
      )
      .map((b) => b.categoryId)
  );
  const relevantCategoryIds = new Set<string>([
    ...spendingMap.keys(),
    ...relevantBudgetIds,
  ]);

  return SPENDING_CATEGORIES.filter((cat) =>
    relevantCategoryIds.has(cat.id)
  ).map((cat) => {
    const spent = spendingMap.get(cat.id) ?? 0;
    const budget = budgetMap.get(cat.id);

    // Only reference the budget if its type matches the current view — a
    // monthly budget is meaningless in annual view and vice versa.
    const budgetMatchesView =
      budget != null &&
      ((viewMode === "monthly" && budget.budgetType === "monthly") ||
        (viewMode === "annual" && budget.budgetType === "annual"));

    const budgetAmount = budgetMatchesView
      ? convertCurrency(
          budget.budgetAmount,
          budget.currency,
          displayCurrency,
          rates
        )
      : null;
    const percentUsed = budgetAmount ? (spent / budgetAmount) * 100 : null;

    // Pace-based overspend warning only applies to monthly view — annual
    // budgets span the whole year, so a linear projection isn't useful.
    // Also skip categories that are pre-entered fixed costs (e.g. 房租
    // paid in full on day 1 always reads as "danger" by projection).
    const warningLevel =
      budgetAmount &&
      viewMode === "monthly" &&
      !PREDICTION_EXCLUDED_CATEGORY_IDS.has(cat.id)
        ? calculateBudgetWarning(spent, budgetAmount, dayOfMonth, daysInMonth)
        : "none";

    return {
      category: cat,
      totalSpent: spent,
      budget: budgetAmount,
      percentUsed,
      projectedOverspend:
        warningLevel === "danger" || warningLevel === "warning",
      budgetType: budgetMatchesView ? (budget.budgetType ?? null) : null,
      warningLevel,
    };
  });
}

interface AnalyticsClientProps {
  displayCurrency: Currency;
  rates: RateMap;
}

export function AnalyticsClient({
  displayCurrency,
  rates,
}: AnalyticsClientProps) {
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  // Year-wide source of truth. The monthly list is derived from this via
  // a date-range filter, so edits and deletes only need to update one
  // place and both views stay in sync.
  const [yearTransactions, setYearTransactions] = useState<
    SpendingTransaction[]
  >([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  // Budget-editing state — which category is having its budget edited.
  const [editingBudgetCategory, setEditingBudgetCategory] =
    useState<SpendingCategory | null>(null);
  // Transaction-editing state — which existing tx is open in the modal.
  const [editingTx, setEditingTx] = useState<SpendingTransaction | null>(null);
  // Budget-warning cat popup: track user dismissals by month key and
  // persist across page navigation within the session via sessionStorage.
  // Derived visibility (below) rather than stored, so we don't violate
  // the "no setState in effect" rule.
  const [dismissedMonthKey, setDismissedMonthKey] = useState<string | null>(
    null
  );

  const { startDate, endDate, daysInMonth } = monthBoundariesLocal(year, month);
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();
  const dayOfMonth = isCurrentMonth ? now.getDate() : daysInMonth;

  // Monthly transactions derived from the year source. Cheap string
  // comparison — DB dates are ISO YYYY-MM-DD and boundary strings are too.
  const monthlyTransactions = yearTransactions.filter(
    (tx) => tx.date >= startDate && tx.date <= endDate
  );

  // Year-to-date spending map (display-currency-normalized) for all
  // categories. Used by annual view headers and by annual budget
  // percentage rendering in monthly view's expanded accordion.
  const annualSpending = new Map<string, number>();
  for (const tx of yearTransactions) {
    const converted = convertCurrency(
      tx.amount,
      tx.currency,
      displayCurrency,
      rates
    );
    annualSpending.set(
      tx.categoryId,
      (annualSpending.get(tx.categoryId) ?? 0) + converted
    );
  }

  useEffect(() => {
    let cancelled = false;
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    async function load() {
      setLoading(true);
      try {
        const [yearTxs, bgs] = await Promise.all([
          getSpendingTransactions(yearStart, yearEnd),
          getCategoryBudgets(),
        ]);
        if (!cancelled) {
          setYearTransactions(yearTxs);
          setBudgets(bgs);
        }
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // Only year changes trigger a DB refetch — month changes within a year
    // just re-filter the local array.
  }, [year]);

  const goBack = () => {
    if (viewMode === "monthly") {
      if (month === 0) {
        setYear(year - 1);
        setMonth(11);
      } else {
        setMonth(month - 1);
      }
    } else {
      setYear(year - 1);
    }
  };

  const goForward = () => {
    if (viewMode === "monthly") {
      if (month === 11) {
        setYear(year + 1);
        setMonth(0);
      } else {
        setMonth(month + 1);
      }
    } else {
      setYear(year + 1);
    }
  };

  const summaries = computeSummaries({
    monthlyTransactions,
    annualSpendingMap: annualSpending,
    budgets,
    displayCurrency,
    rates,
    viewMode,
    dayOfMonth,
    daysInMonth,
  });

  // Highest pace-based warning across all monthly budgets. Danger trumps
  // warning; caution and none don't trigger the cat popup. Only computed
  // in monthly view — annual budgets don't have pace warnings.
  let highestWarning: WarningModalLevel | null = null;
  if (viewMode === "monthly") {
    for (const s of summaries) {
      if (s.warningLevel === "danger") {
        highestWarning = "danger";
        break;
      }
      if (s.warningLevel === "warning") highestWarning = "warning";
    }
  }

  // Derive modal visibility from: (a) a warning exists, (b) data loaded,
  // (c) user hasn't dismissed this month during the current mount. No
  // sessionStorage persistence — the popup is a nudge, and the user
  // wants to see it every time they open the page.
  const monthKey = `${year}-${month}`;
  const warningCatLevel: WarningModalLevel | null =
    !loading && highestWarning !== null && dismissedMonthKey !== monthKey
      ? highestWarning
      : null;
  const editingTxCategory = editingTx
    ? (SPENDING_CATEGORIES.find((c) => c.id === editingTx.categoryId) ?? null)
    : null;
  const editingBudget = editingBudgetCategory
    ? (budgets.find((b) => b.categoryId === editingBudgetCategory.id) ?? null)
    : null;

  const handleBudgetSave = (saved: CategoryBudget) => {
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.categoryId === saved.categoryId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });
  };

  const handleEditBudget = (categoryId: string) => {
    const cat = SPENDING_CATEGORIES.find((c) => c.id === categoryId);
    if (cat) setEditingBudgetCategory(cat);
  };

  const handleUpdateTx = async (entry: {
    categoryId: string;
    amount: number;
    currency: Currency;
    date: string;
    notes: string | null;
  }) => {
    if (!editingTx) return;
    try {
      const saved = await updateSpendingTransaction(editingTx.id, {
        categoryId: entry.categoryId,
        amount: entry.amount,
        currency: entry.currency,
        date: entry.date,
        notes: entry.notes,
      });
      // Local in-place update — avoids a refetch + loading flash. Monthly
      // view's list is derived from this array via a date-range filter,
      // so both views stay in sync automatically.
      setYearTransactions((prev) =>
        prev.map((t) => (t.id === saved.id ? saved : t))
      );
      toast.success("已保存");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.danger("保存失败", { description: message });
    }
  };

  const handleDeleteTx = async () => {
    if (!editingTx) return;
    const id = editingTx.id;
    try {
      await deleteSpendingTransaction(id);
      setYearTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success("已删除");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.danger("删除失败", { description: message });
    }
  };

  return (
    <>
      {/* View mode toggle — centered */}
      <div className="flex justify-center">
        <ToggleButtonGroup
          aria-label="视图"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set<Key>([viewMode])}
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next) setViewMode(next as ViewMode);
          }}
        >
          <ToggleButton id="monthly">月度</ToggleButton>
          <ToggleButtonGroup.Separator />
          <ToggleButton id="annual">年度</ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* Period nav — shows month+year in monthly view, year only in annual */}
      <div className="flex items-center justify-between">
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          onPress={goBack}
          aria-label={viewMode === "monthly" ? "上一月" : "上一年"}
        >
          <ChevronLeft size={20} />
        </Button>
        <span className="text-lg font-semibold">
          {viewMode === "monthly" ? `${year}年${month + 1}月` : `${year}年`}
        </span>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          onPress={goForward}
          aria-label={viewMode === "monthly" ? "下一月" : "下一年"}
        >
          <ChevronRight size={20} />
        </Button>
      </div>

      {loading ? (
        <>
          <div className="h-64 animate-pulse rounded-2xl bg-default" />
          <div className="h-20 animate-pulse rounded-2xl bg-default" />
          <div className="h-20 animate-pulse rounded-2xl bg-default" />
        </>
      ) : (
        <>
          {/* Line chart with subheader showing the period's total spend.
              Monthly view: per-day, monthly total in subheader.
              Annual view: per-month, annual total in subheader. */}
          {viewMode === "monthly" ? (
            <SpendingLineChart
              transactions={monthlyTransactions}
              startDate={startDate}
              endDate={endDate}
              displayCurrency={displayCurrency}
              rates={rates}
              granularity="day"
              subheader={`${year}年${month + 1}月总支出 ${formatCurrency(
                sumInDisplayCurrency(
                  monthlyTransactions,
                  displayCurrency,
                  rates
                ),
                displayCurrency
              )}`}
            />
          ) : (
            <SpendingLineChart
              transactions={yearTransactions}
              startDate={`${year}-01-01`}
              endDate={`${year}-12-31`}
              displayCurrency={displayCurrency}
              rates={rates}
              granularity="month"
              subheader={`${year}年总支出 ${formatCurrency(
                sumInDisplayCurrency(
                  yearTransactions,
                  displayCurrency,
                  rates
                ),
                displayCurrency
              )}`}
            />
          )}
          {summaries.length > 0 ? (
            <CategoryBreakdown
              summaries={summaries}
              transactions={
                viewMode === "monthly" ? monthlyTransactions : yearTransactions
              }
              displayCurrency={displayCurrency}
              rates={rates}
              viewMode={viewMode}
              onEditBudget={handleEditBudget}
              onEditTx={(tx) => setEditingTx(tx)}
            />
          ) : (
            <p className="py-8 text-center text-muted">
              {viewMode === "monthly" ? "本月暂无支出记录" : "本年暂无支出记录"}
            </p>
          )}
        </>
      )}

      {/* Budget editor — per category */}
      {editingBudgetCategory && (
        <BudgetSettingsModal
          category={editingBudgetCategory}
          currentBudget={editingBudget}
          isOpen={!!editingBudgetCategory}
          onClose={() => setEditingBudgetCategory(null)}
          onSave={handleBudgetSave}
        />
      )}

      {/* Transaction editor — conditionally rendered with key so internal
          state re-inits when switching between transactions. */}
      {editingTx && editingTxCategory && (
        <QuickEntryModal
          key={editingTx.id}
          category={editingTxCategory}
          isOpen={!!editingTx}
          onClose={() => setEditingTx(null)}
          onSave={handleUpdateTx}
          initialValues={{
            amount: editingTx.amount,
            currency: editingTx.currency,
            date: editingTx.date,
            notes: editingTx.notes,
          }}
          onDelete={handleDeleteTx}
        />
      )}

      {/* Budget-warning cat popup — shown once per month per session
          when any monthly budget is in warning/danger state. */}
      <BudgetWarningModal
        level={warningCatLevel}
        onClose={() => setDismissedMonthKey(monthKey)}
      />
    </>
  );
}
