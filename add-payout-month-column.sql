-- Add payout_month column to existing payouts table
-- Run this snippet in your SQL editor

-- Add the new column
ALTER TABLE payouts ADD COLUMN payout_month VARCHAR(7) DEFAULT '2025-08';

-- Create index for better performance
CREATE INDEX idx_payouts_payout_month ON payouts(payout_month);

-- Update existing rows to set payout_month to 2025-08
UPDATE payouts SET payout_month = '2025-08' WHERE payout_month IS NULL;
