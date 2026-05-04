-- Add 'cnFund' to the assets category CHECK constraint
-- Run this in Supabase SQL Editor

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_category_check;
ALTER TABLE assets ADD CONSTRAINT assets_category_check
  CHECK (category IN ('usStock', 'jpFund', 'cnFund', 'bankDeposit', 'cash', 'other'));
