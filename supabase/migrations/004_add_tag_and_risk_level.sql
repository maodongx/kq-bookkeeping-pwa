-- Add tag and risk_level columns to assets
-- Run this in Supabase SQL Editor

ALTER TABLE assets ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS risk_level TEXT
  CHECK (risk_level IN ('low', 'medium', 'high'));
