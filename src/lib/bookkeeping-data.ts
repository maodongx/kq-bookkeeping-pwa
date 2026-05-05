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

/**
 * Update a subset of fields on an existing spending transaction and return
 * the refreshed row. Pass only the fields that changed — anything omitted
 * is left alone in the DB.
 */
export async function updateSpendingTransaction(
  id: string,
  fields: Partial<Omit<SpendingTransaction, "id" | "createdAt">>
): Promise<SpendingTransaction> {
  const supabase = createClient();

  const payload: Record<string, unknown> = {};
  if (fields.categoryId !== undefined) payload.category_id = fields.categoryId;
  if (fields.amount !== undefined) payload.amount = fields.amount;
  if (fields.currency !== undefined) payload.currency = fields.currency;
  if (fields.date !== undefined) payload.date = fields.date;
  if (fields.notes !== undefined) payload.notes = fields.notes;

  const { data, error } = await supabase
    .from("spending_transactions")
    .update(payload)
    .eq("id", id)
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

/** Delete a spending transaction by id. */
export async function deleteSpendingTransaction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("spending_transactions")
    .delete()
    .eq("id", id);
  if (error) throw error;
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
 * Return up to `limit` most-used note keywords for a category. "Most used"
 * is measured over the last 200 transactions in that category to bound
 * the work; groups similar notes together (case-insensitive, trimmed) so
 * `Starbucks`, `starbucks`, and ` Starbucks ` count as the same keyword
 * when ranking. The display form returned is whichever exact string the
 * user typed most recently for that canonical key — feels less like a
 * spell-corrector and more like "quick reuse of what I just typed".
 *
 * Fetched on modal open, so every new save is reflected the next time the
 * user opens an entry for that category. No caching, no aggregate table.
 */
export async function getTopNotesForCategory(
  categoryId: string,
  limit = 5
): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("spending_transactions")
    .select("notes, created_at")
    .eq("category_id", categoryId)
    .not("notes", "is", null)
    .neq("notes", "")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  // Rows arrive most-recent-first. The first time we see each canonical
  // key we store that raw form as the display string, and count any later
  // variants as the same group.
  const groups = new Map<string, { count: number; display: string }>();
  for (const row of data ?? []) {
    const raw = typeof row.notes === "string" ? row.notes.trim() : "";
    if (!raw) continue;
    const key = raw.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { count: 1, display: raw });
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((g) => g.display);
}

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
