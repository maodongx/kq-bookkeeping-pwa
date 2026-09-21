-- Two schema hardening changes found during a full audit.
--
-- Run manually in the Supabase SQL Editor, like every other migration here.

-- 1. `assets.tag` was added as a bare TEXT column while the TypeScript side
--    (`AssetTag` in src/lib/types.ts) treats it as a closed 6-value union.
--    `risk_level` got a CHECK in the same migration; `tag` was missed. A value
--    outside the union renders as an unlabelled slice in the allocation pie
--    chart with no color mapping.
--
--    Any pre-existing rows outside the list are normalized to NULL ("未分类")
--    first, so the constraint can be added without failing validation.
UPDATE assets
SET tag = NULL
WHERE tag IS NOT NULL
  AND tag NOT IN ('个股', '宽基股票基金', '行业股票基金', '债券基金', '黄金', '现金');

ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_tag_check;

ALTER TABLE assets
  ADD CONSTRAINT assets_tag_check
  CHECK (
    tag IS NULL
    OR tag IN ('个股', '宽基股票基金', '行业股票基金', '债券基金', '黄金', '现金')
  );

-- 2. Both snapshot tables are read with `ORDER BY date`, but the only index
--    covering them is the `(asset_id, date)` / `(base_currency, target_currency,
--    date)` unique constraint, whose leading column isn't `date`. That makes
--    every dashboard render do a full sort.
CREATE INDEX IF NOT EXISTS idx_asset_price_snapshots_date
  ON asset_price_snapshots (date);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_snapshots_date
  ON exchange_rate_snapshots (date);
