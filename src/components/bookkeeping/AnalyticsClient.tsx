"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SpendingLineChart } from "./SpendingLineChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { BudgetSettingsModal } from "./BudgetSettingsModal";
import {
  SPENDING_CATEGORIES,
  calculateBudgetWarning,
  getCategoryBudgets,
  getSpendingTransactions,
} from "@/lib/bookkeeping-data";
import { monthBoundariesLocal } from "@/lib/date";
import type {
  CategoryBudget,
  CategorySpendingSummary,
  SpendingCategory,
  SpendingTransaction,
} from "@/lib/bookkeeping-types";

function computeSummaries(
  transactions: SpendingTransaction[],
  budgets: CategoryBudget[],
  dayOfMonth: number,
  daysInMonth: number
): CategorySpendingSummary[] {
  const budgetMap = new Map(budgets.map((b) => [b.categoryId, b]));
  const spendingMap = new Map<string, number>();

  for (const tx of transactions) {
    spendingMap.set(
      tx.categoryId,
      (spendingMap.get(tx.categoryId) ?? 0) + tx.amount
    );
  }

  return SPENDING_CATEGORIES.filter((cat) => spendingMap.has(cat.id)).map(
    (cat) => {
      const spent = spendingMap.get(cat.id) ?? 0;
      const budget = budgetMap.get(cat.id);
      const budgetAmount = budget?.monthlyBudget ?? null;
      const percentUsed = budgetAmount ? (spent / budgetAmount) * 100 : null;
      const warningLevel = budgetAmount
        ? calculateBudgetWarning(
            spent,
            budgetAmount,
            dayOfMonth,
            daysInMonth
          )
        : "none";

      return {
        category: cat,
        totalSpent: spent,
        budget: budgetAmount,
        percentUsed,
        projectedOverspend:
          warningLevel === "danger" || warningLevel === "warning",
      };
    }
  );
}

export function AnalyticsClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [transactions, setTransactions] = useState<SpendingTransaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<SpendingCategory | null>(null);

  const { startDate, endDate, daysInMonth } = monthBoundariesLocal(year, month);
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();
  const dayOfMonth = isCurrentMonth ? now.getDate() : daysInMonth;

  useEffect(() => {
    let cancelled = false;
    const { startDate: sd, endDate: ed } = monthBoundariesLocal(year, month);

    async function load() {
      setLoading(true);
      try {
        const [txs, bgs] = await Promise.all([
          getSpendingTransactions(sd, ed),
          getCategoryBudgets(),
        ]);
        if (!cancelled) {
          setTransactions(txs);
          setBudgets(bgs);
        }
      } catch (error) {
        // Don't silently swallow — log for devtools. Analytics has no
        // write path, so there's no toast to show; empty state below is
        // what the user sees.
        console.error("Failed to fetch analytics data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

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
    dayOfMonth,
    daysInMonth
  );
  const selectedBudget = selectedCategory
    ? (budgets.find((b) => b.categoryId === selectedCategory.id) ?? null)
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

  const handleCategoryTap = (categoryId: string) => {
    const cat = SPENDING_CATEGORIES.find((c) => c.id === categoryId);
    if (cat) setSelectedCategory(cat);
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
          />
          {summaries.length > 0 ? (
            <CategoryBreakdown
              summaries={summaries}
              onCategoryTap={handleCategoryTap}
            />
          ) : (
            <p className="py-8 text-center text-muted">本月暂无支出记录</p>
          )}
        </>
      )}

      {selectedCategory && (
        <BudgetSettingsModal
          category={selectedCategory}
          currentBudget={selectedBudget}
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          onSave={handleBudgetSave}
        />
      )}
    </>
  );
}
