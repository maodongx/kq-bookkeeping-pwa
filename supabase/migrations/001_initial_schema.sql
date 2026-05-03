-- KQ Bookkeeping schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('usStock', 'jpFund', 'bankDeposit', 'cash', 'other')),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'JPY', 'CNY')),
  symbol TEXT,
  fund_provider TEXT CHECK (fund_provider IN ('mufg', 'rakuten', 'other')),
  note TEXT,
  current_price NUMERIC,
  last_price_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'deposit', 'withdraw', 'adjustment')),
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Price snapshots (historical prices)
CREATE TABLE asset_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  date DATE NOT NULL
);

-- Exchange rate snapshots
CREATE TABLE exchange_rate_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL CHECK (base_currency IN ('USD', 'JPY', 'CNY')),
  target_currency TEXT NOT NULL CHECK (target_currency IN ('USD', 'JPY', 'CNY')),
  rate NUMERIC NOT NULL,
  date DATE NOT NULL
);

-- Indexes
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_price_snapshots_asset_id ON asset_price_snapshots(asset_id);
CREATE INDEX idx_exchange_rates_date ON exchange_rate_snapshots(date);

-- Enable Row-Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rate_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies: only authenticated users can access (shared household)
CREATE POLICY "Authenticated users have full access to assets"
  ON assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to transactions"
  ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to price snapshots"
  ON asset_price_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to exchange rates"
  ON exchange_rate_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
