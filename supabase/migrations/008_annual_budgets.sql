-- Migration: 008_annual_budgets
-- Add budget_type column to support both monthly and annual budgets.
-- Annual budgets (美容美妆, 远途旅行, 父母) carry over for the full year (01/01 - 12/31).

ALTER TABLE category_budgets
  ADD COLUMN budget_type TEXT NOT NULL DEFAULT 'monthly'
  CHECK (budget_type IN ('monthly', 'annual'));

-- Rename monthly_budget to budget_amount since it can now be annual too
ALTER TABLE category_budgets
  RENAME COLUMN monthly_budget TO budget_amount;

COMMENT ON COLUMN category_budgets.budget_type IS
  'monthly = resets each month, annual = carries over Jan 1 to Dec 31';
