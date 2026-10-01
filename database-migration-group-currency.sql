-- Group currency. Existing groups stay in SRD.
-- New groups can be SRD, USD, or EUR.
-- Run this in the Supabase SQL Editor before creating a group in another currency.

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

UPDATE groups
SET currency = 'SRD'
WHERE currency IS NULL;

ALTER TABLE groups
  ALTER COLUMN currency SET DEFAULT 'SRD',
  ALTER COLUMN currency SET NOT NULL;

ALTER TABLE groups
  DROP CONSTRAINT IF EXISTS groups_currency_check;

ALTER TABLE groups
  ADD CONSTRAINT groups_currency_check
  CHECK (currency IN ('SRD', 'USD', 'EUR'));
