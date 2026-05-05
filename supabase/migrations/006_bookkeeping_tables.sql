-- Migration: 006_bookkeeping_tables
-- Bookkeeping feature: per-user spending transactions and per-category monthly budgets.
--
-- Note on security model: unlike the asset/transaction tables which use shared-household
-- RLS ('authenticated users see everything'), the bookkeeping tables are PER-USER —
-- spending is a personal concern. RLS enforces `auth.uid() = user_id` on every row.
-- Run this once in the Supabase SQL Editor.

-- spending_transactions table
CREATE TABLE spending_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'JPY' CHECK (currency IN ('JPY', 'USD', 'CNY')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- category_budgets table — one row per (user, category)
CREATE TABLE category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  monthly_budget NUMERIC NOT NULL CHECK (monthly_budget >= 0),
  currency TEXT NOT NULL DEFAULT 'JPY' CHECK (currency IN ('JPY', 'USD', 'CNY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Indexes for query performance
CREATE INDEX idx_spending_transactions_user_date ON spending_transactions(user_id, date);
CREATE INDEX idx_spending_transactions_category ON spending_transactions(category_id);
CREATE INDEX idx_category_budgets_user ON category_budgets(user_id);

-- Enable Row Level Security
ALTER TABLE spending_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: scope to the authenticated role and include WITH CHECK so writes
-- are validated in addition to reads. Matches the pattern in 001_initial_schema.sql.
CREATE POLICY "Users can manage own transactions" ON spending_transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own budgets" ON category_budgets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
