"use client";

import { useEffect, useState } from "react";
import { Button, toast } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SpendingLineChart } from "./SpendingLineChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { BudgetSettingsModal } from "./BudgetSettingsModal";
import { QuickEntryModal } from "./QuickEntryModal";
import {
  SPENDING_CATEGORIES,
  calculateBudgetWarning,
  deleteSpendingTransaction,
  getCategoryBudgets,
  getSpendingTransactions,
  updateSpendingTransaction,
} from "@/lib/bookkeeping-data";
import { monthBoundariesLocal } from "@/lib/date";
import { convertCurrency, type RateMap } from "@/lib/exchange-rates";
import type { Currency } from "@/lib/types";
import type {
  CategoryBudget,
  CategorySpendingSummary,
  SpendingCategory,
  SpendingTransaction,
} from "@/lib/bookkeeping-types";

/**
 * Turn raw per-currency rows into per-category summaries normalized to
 * `displayCurrency`. Every `tx.amount` and `budget.budgetAmount` passes
 * through `convertCurrency` so the totals, percentUsed, and the
 * warning-level computation all compare like-to-like.
 *
 * For annual budgets, `annualSpendingMap` provides year-to-date totals
 * instead of monthly totals.
 */
function computeSummaries(
  transactions: SpendingTransaction[],
  budgets: CategoryBudget[],
  displayCurrency: Currency,
  rates: RateMap,
  dayOfMonth: number,
  daysInMonth: number,
  annualSpendingMap: Map<string, number>
): CategorySpendingSummary[] {
  const budgetMap = new Map(budgets.map((b) => [b.categoryId, b]));
  const monthlySpendingMap = new Map<string, number>();

  for (const tx of transactions) {
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

  // Include categories with either spending OR a budget
  const relevantCategoryIds = new Set<string>([
    ...monthlySpendingMap.keys(),
    ...annualSpendingMap.keys(),
    ...budgetMap.keys(),
  ]);

  return SPENDING_CATEGORIES.filter((cat) =>
    relevantCategoryIds.has(cat.id)
  ).map((cat) => {
    const budget = budgetMap.get(cat.id);
    const isAnnual = budget?.budgetType === "annual";

    // For annual budgets, use year-to-date spending; for monthly, use this month
    const spent = isAnnual
      ? (annualSpendingMap.get(cat.id) ?? 0)
      : (monthlySpendingMap.get(cat.id) ?? 0);

    const budgetAmount = budget
      ? convertCurrency(
          budget.budgetAmount,
          budget.currency,
          displayCurrency,
          rates
        )
      : null;
    const percentUsed = budgetAmount ? (spent / budgetAmount) * 100 : null;

    // For annual budgets, no pace-based warning — just show remaining
    const warningLevel =
      budgetAmount && !isAnnual
        ? calculateBudgetWarning(spent, budgetAmount, dayOfMonth, daysInMonth)
        : "none";

    return {
      category: cat,
      totalSpent: spent,
      budget: budgetAmount,
      percentUsed,
      projectedOverspend:
        warningLevel === "danger" || warningLevel === "warning",
      budgetType: budget?.budgetType ?? null,
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
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [transactions, setTransactions] = useState<SpendingTransaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  // Budget-editing state — which category is having its monthly budget edited.
  const [editingBudgetCategory, setEditingBudgetCategory] =
    useState<SpendingCategory | null>(null);
  // Transaction-editing state — which existing tx is open in the modal.
  const [editingTx, setEditingTx] = useState<SpendingTransaction | null>(null);

  const { startDate, endDate, daysInMonth } = monthBoundariesLocal(year, month);
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();
  const dayOfMonth = isCurrentMonth ? now.getDate() : daysInMonth;

  // Year-to-date spending for annual budget categories
  const [annualSpending, setAnnualSpending] = useState<Map<string, number>>(
    new Map()
  );

  useEffect(() => {
    let cancelled = false;
    const { startDate: sd, endDate: ed } = monthBoundariesLocal(year, month);
    // Year boundaries for annual budgets
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    async function load() {
      setLoading(true);
      try {
        const [txs, bgs, yearTxs] = await Promise.all([
          getSpendingTransactions(sd, ed),
          getCategoryBudgets(),
          getSpendingTransactions(yearStart, yearEnd),
        ]);
        if (!cancelled) {
          setTransactions(txs);
          setBudgets(bgs);

          // Compute year-to-date totals for annual budget categories
          const annualCategoryIds = new Set(
            bgs.filter((b) => b.budgetType === "annual").map((b) => b.categoryId)
          );
          const annualMap = new Map<string, number>();
          for (const tx of yearTxs) {
            if (annualCategoryIds.has(tx.categoryId)) {
              const converted = convertCurrency(
                tx.amount,
                tx.currency,
                displayCurrency,
                rates
              );
              annualMap.set(
                tx.categoryId,
                (annualMap.get(tx.categoryId) ?? 0) + converted
              );
            }
          }
          setAnnualSpending(annualMap);
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
  }, [year, month, displayCurrency, rates]);

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const summaries = computeSummaries(
    transactions,
    budgets,
    displayCurrency,
    rates,
    dayOfMonth,
    daysInMonth,
    annualSpending
  );
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
      // Local in-place update — avoids a refetch + loading flash.
      setTransactions((prev) =>
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
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success("已删除");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.danger("删除失败", { description: message });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          onPress={goToPrevMonth}
          aria-label="上一月"
        >
          <ChevronLeft size={20} />
        </Button>
        <span className="text-lg font-semibold">
          {year}年{month + 1}月
        </span>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          onPress={goToNextMonth}
          aria-label="下一月"
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
          <SpendingLineChart
            transactions={transactions}
            startDate={startDate}
            endDate={endDate}
            displayCurrency={displayCurrency}
            rates={rates}
          />
          {summaries.length > 0 ? (
            <CategoryBreakdown
              summaries={summaries}
              transactions={transactions}
              displayCurrency={displayCurrency}
              rates={rates}
              onEditBudget={handleEditBudget}
              onEditTx={(tx) => setEditingTx(tx)}
            />
          ) : (
            <p className="py-8 text-center text-muted">本月暂无支出记录</p>
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
    </>
  );
}
