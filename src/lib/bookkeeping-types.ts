/**
 * TypeScript types for the bookkeeping (spending tracker) feature.
 * Separate from the investment-tracking types in `./types.ts` because the
 * two domains are independent — one tracks what the user SPENT, the other
 * tracks what the user OWNS.
 */
import type { Currency } from "./types";

/** A spending category, e.g. 房租 or 食费. */
export interface SpendingCategory {
  id: string;
  name: string;
  /** Lucide icon name (e.g. "Home", "Utensils"). Resolved via CATEGORY_ICONS. */
  icon: string;
  sortOrder: number;
}

/** A single spending transaction row. */
export interface SpendingTransaction {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: Currency;
  /** YYYY-MM-DD in the user's local timezone. */
  date: string;
  notes: string | null;
  /** ISO timestamp from the DB. */
  createdAt: string;
}

/** Monthly budget for a category (one per user per category). */
export interface CategoryBudget {
  id: string;
  userId: string;
  categoryId: string;
  monthlyBudget: number;
  currency: Currency;
}

/** Computed summary for analytics display. */
export interface CategorySpendingSummary {
  category: SpendingCategory;
  totalSpent: number;
  budget: number | null;
  /** Null if no budget is set for this category. */
  percentUsed: number | null;
  /** True when projected month-end spend will exceed the budget at current pace. */
  projectedOverspend: boolean;
}
