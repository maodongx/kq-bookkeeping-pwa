import {
  Home,
  Zap,
  Utensils,
  UtensilsCrossed,
  ShoppingBag,
  Coffee,
  Store,
  Smartphone,
  Train,
  Gamepad2,
  ShoppingCart,
  Heart,
  Gift,
  Sparkles,
  Plane,
  Receipt,
  HeartHandshake,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  SpendingCategory,
  SpendingTransaction,
  CategoryBudget,
} from "@/lib/bookkeeping-types";

/**
 * Lucide icon components keyed by the `icon` string stored on each
 * `SpendingCategory`. Exported as a map (not a function) so consumers
 * do the lookup inline — `react-hooks/static-components` rejects
 * returning components from a function called during render, but a
 * direct object index is fine.
 *
 *   const Icon = CATEGORY_ICONS[cat.icon] ?? CATEGORY_ICON_FALLBACK;
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Home,
  Zap,
  Utensils,
  UtensilsCrossed,
  ShoppingBag,
  Coffee,
  Store,
  Smartphone,
  Train,
  Gamepad2,
  ShoppingCart,
  Heart,
  Gift,
  Sparkles,
  Plane,
  Receipt,
  HeartHandshake,
};

export const CATEGORY_ICON_FALLBACK = HelpCircle;

/** All 17 spending categories. Order here is the display order in the UI. */
export const SPENDING_CATEGORIES: SpendingCategory[] = [
  { id: "rent", name: "房租", icon: "Home", sortOrder: 1 },
  { id: "utilities", name: "水电气", icon: "Zap", sortOrder: 2 },
  { id: "food", name: "食费", icon: "Utensils", sortOrder: 3 },
  { id: "daily", name: "日用", icon: "ShoppingBag", sortOrder: 4 },
  { id: "dining-out", name: "外食", icon: "UtensilsCrossed", sortOrder: 5 },
  { id: "work-meal", name: "工作餐", icon: "Coffee", sortOrder: 6 },
  { id: "convenience", name: "便利店", icon: "Store", sortOrder: 7 },
  { id: "telecom", name: "通讯", icon: "Smartphone", sortOrder: 8 },
  { id: "transport", name: "交通", icon: "Train", sortOrder: 9 },
  { id: "entertainment", name: "日常娱乐", icon: "Gamepad2", sortOrder: 10 },
  { id: "household", name: "家庭购物", icon: "ShoppingCart", sortOrder: 11 },
  { id: "health", name: "医疗健身", icon: "Heart", sortOrder: 12 },
  { id: "gifts", name: "人情礼物", icon: "Gift", sortOrder: 13 },
  { id: "beauty", name: "美容美妆", icon: "Sparkles", sortOrder: 14 },
  { id: "travel", name: "远途旅行", icon: "Plane", sortOrder: 15 },
  { id: "tax", name: "税金", icon: "Receipt", sortOrder: 16 },
  { id: "parents", name: "父母", icon: "HeartHandshake", sortOrder: 17 },
];

/** Fetch spending transactions within an inclusive date range. */
export async function getSpendingTransactions(
  startDate: string,
  endDate: string
): Promise<SpendingTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("spending_transactions")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    amount: row.amount,
    currency: row.currency,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

/** Insert a new spending transaction. */
export async function createSpendingTransaction(
  tx: Omit<SpendingTransaction, "id" | "createdAt">
): Promise<SpendingTransaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("spending_transactions")
    .insert({
      category_id: tx.categoryId,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.date,
      notes: tx.notes,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    categoryId: data.category_id,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
    notes: data.notes,
    createdAt: data.created_at,
  };
}

/** Fetch all category budgets (shared across the household). */
export async function getCategoryBudgets(): Promise<CategoryBudget[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("category_budgets")
    .select("*");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    monthlyBudget: row.monthly_budget,
    currency: row.currency,
  }));
}

/** Create or update a category budget (upsert by category_id). */
export async function upsertCategoryBudget(
  budget: Omit<CategoryBudget, "id">
): Promise<CategoryBudget> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("category_budgets")
    .upsert(
      {
        category_id: budget.categoryId,
        monthly_budget: budget.monthlyBudget,
        currency: budget.currency,
      },
      { onConflict: "category_id" }
    )
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    categoryId: data.category_id,
    monthlyBudget: data.monthly_budget,
    currency: data.currency,
  };
}

/** Warning levels for budget status, driven by pace-based projection. */
export type BudgetWarningLevel = "none" | "caution" | "warning" | "danger";

/**
 * Classify budget health by projecting current pace to month end.
 *  - `danger`  — already over, OR projected to exceed 100%.
 *  - `warning` — projected to hit 80%-100%.
 *  - `caution` — projected to hit 60%-80%.
 *  - `none`    — on track or no budget set.
 */
export function calculateBudgetWarning(
  spent: number,
  budget: number,
  dayOfMonth: number,
  daysInMonth: number
): BudgetWarningLevel {
  if (budget <= 0) return "none";
  if (spent >= budget) return "danger";

  const percentMonthElapsed = dayOfMonth / daysInMonth;
  const projectedSpend =
    percentMonthElapsed > 0 ? spent / percentMonthElapsed : spent;
  const projectedPercent = projectedSpend / budget;

  if (projectedPercent >= 1) return "danger";
  if (projectedPercent >= 0.8) return "warning";
  if (projectedPercent >= 0.6) return "caution";
  return "none";
}
