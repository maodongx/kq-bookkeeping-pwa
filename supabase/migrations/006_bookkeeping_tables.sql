-- Migration: 006_bookkeeping_tables
-- Bookkeeping feature: spending transactions and per-category monthly budgets.
--
-- RLS model: shared-household, matching the asset-side tables in 001.
-- Both accounts see the same spending log and the same budgets — there's
-- no user_id column, just like `assets` and `transactions`.
-- Run this once in the Supabase SQL Editor.

-- spending_transactions table
CREATE TABLE spending_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'JPY' CHECK (currency IN ('JPY', 'USD', 'CNY')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- category_budgets table — one row per category (shared across the household)
CREATE TABLE category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL UNIQUE,
  monthly_budget NUMERIC NOT NULL CHECK (monthly_budget >= 0),
  currency TEXT NOT NULL DEFAULT 'JPY' CHECK (currency IN ('JPY', 'USD', 'CNY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for query performance
CREATE INDEX idx_spending_transactions_date ON spending_transactions(date);
CREATE INDEX idx_spending_transactions_category ON spending_transactions(category_id);

-- Enable Row Level Security
ALTER TABLE spending_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: shared-household — any authenticated user can read + write
-- both tables. Matches the pattern used by `assets`, `transactions`, and
-- the snapshot tables in 001_initial_schema.sql.
CREATE POLICY "Authenticated users have full access to spending transactions"
  ON spending_transactions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to category budgets"
  ON category_budgets FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
