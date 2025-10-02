-- Database Migration: Add calculated total amount and settled deduction toggle to payouts table
-- This migration adds columns to store pre-calculated payout amounts and toggle states

-- Add new columns to payouts table
ALTER TABLE payouts 
ADD COLUMN IF NOT EXISTS calculated_total_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS settled_deduction_enabled BOOLEAN DEFAULT TRUE;

-- Add comments for documentation
COMMENT ON COLUMN payouts.calculated_total_amount IS 'Pre-calculated total amount after all deductions and additional costs';
COMMENT ON COLUMN payouts.settled_deduction_enabled IS 'Toggle state for settled deduction (TRUE = enabled, FALSE = disabled)';

-- Create index for better performance on calculated amounts
CREATE INDEX IF NOT EXISTS idx_payouts_calculated_total_amount ON payouts(calculated_total_amount);

-- Update existing records to have default values
-- For existing payouts, we'll set calculated_total_amount to the base amount (monthly_amount * duration)
-- and settled_deduction_enabled to TRUE as default
UPDATE payouts 
SET calculated_total_amount = monthly_amount * duration,
    settled_deduction_enabled = TRUE
WHERE calculated_total_amount = 0;

-- Add check constraint to ensure calculated_total_amount is not negative
ALTER TABLE payouts 
ADD CONSTRAINT check_calculated_total_amount_non_negative 
CHECK (calculated_total_amount >= 0);
