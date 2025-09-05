-- Migration: Add payment information fields to payouts
-- Applies to Supabase/Postgres

-- 1) Add new columns
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer','cash')),
  ADD COLUMN IF NOT EXISTS sender_bank BIGINT REFERENCES banks(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS receiver_bank BIGINT REFERENCES banks(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS notes VARCHAR(100);

-- 2) Backfill existing rows: any rows without banks should be CASH
-- Note: when adding the column with DEFAULT, existing rows temporarily get 'bank_transfer'
-- Flip them to 'cash' before adding the CHECK to avoid violations.
UPDATE payouts
SET payment_method = 'cash'
WHERE sender_bank IS NULL AND receiver_bank IS NULL;

-- 3) Add a CHECK constraint that requires banks when payment_method = bank_transfer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payouts_bank_requirements_chk'
  ) THEN
    ALTER TABLE payouts
      ADD CONSTRAINT payouts_bank_requirements_chk
      CHECK (
        (payment_method = 'cash') OR
        (payment_method = 'bank_transfer' AND sender_bank IS NOT NULL AND receiver_bank IS NOT NULL)
      );
  END IF;
END $$;

-- 4) Optional indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payouts_payment_method ON payouts(payment_method);
CREATE INDEX IF NOT EXISTS idx_payouts_sender_bank ON payouts(sender_bank);
CREATE INDEX IF NOT EXISTS idx_payouts_receiver_bank ON payouts(receiver_bank);


