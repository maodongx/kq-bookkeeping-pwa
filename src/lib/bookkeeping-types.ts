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
  categoryId: string;
  amount: number;
  currency: Currency;
  /** YYYY-MM-DD in the user's local timezone. */
  date: string;
  notes: string | null;
  /** ISO timestamp from the DB. */
  createdAt: string;
}

/** Budget for a category. One per category, shared across the household. */
export interface CategoryBudget {
  id: string;
  categoryId: string;
  budgetAmount: number;
  currency: Currency;
  /** 'monthly' resets each month; 'annual' carries over Jan 1 - Dec 31. */
  budgetType: "monthly" | "annual";
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
  /** 'monthly' or 'annual' — affects how the budget label is displayed. */
  budgetType: "monthly" | "annual" | null;
}
