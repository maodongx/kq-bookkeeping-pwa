-- Add 'mmf' (货币基金) and 'managed' (委托理财) to the assets category CHECK constraint.
--
-- These categories have no public price API, so the app tracks them with the
-- balance model (deposit/withdraw/adjustment) — same transaction mechanics
-- as bank/cash, but per-asset gain/loss is computed as (balance - net capital
-- flows) so users can see how much their managed position has grown.
--
-- Run this in Supabase SQL Editor.

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_category_check;
ALTER TABLE assets ADD CONSTRAINT assets_category_check
  CHECK (category IN (
    'usStock', 'jpFund', 'cnFund',
    'mmf', 'managed',
    'bankDeposit', 'cash', 'other'
  ));
