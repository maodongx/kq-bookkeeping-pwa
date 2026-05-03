-- Add unique constraints to enable upserts for daily snapshots
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

ALTER TABLE asset_price_snapshots
  ADD CONSTRAINT uq_price_snapshot_asset_date UNIQUE (asset_id, date);

ALTER TABLE exchange_rate_snapshots
  ADD CONSTRAINT uq_exchange_rate_pair_date UNIQUE (base_currency, target_currency, date);
