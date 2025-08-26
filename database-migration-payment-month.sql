-- Database Migration for Payment Month Column
-- Run this in your Supabase SQL Editor

-- Add payment_month column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_month VARCHAR(7) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Add check constraint to ensure valid format (YYYY-MM)
-- Note: Drop constraint first if it exists, then add it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_payment_month_format') THEN
        ALTER TABLE payments DROP CONSTRAINT check_payment_month_format;
    END IF;
END $$;

ALTER TABLE payments 
ADD CONSTRAINT check_payment_month_format 
CHECK (payment_month ~ '^\d{4}-\d{2}$');

-- Create index for better performance on payment_month queries
CREATE INDEX IF NOT EXISTS idx_payments_payment_month ON payments(payment_month);

-- Update existing payments to have payment_month (if any exist)
-- This sets existing payments to the month they were created
UPDATE payments 
SET payment_month = TO_CHAR(created_at, 'YYYY-MM') 
WHERE payment_month IS NULL;

-- Grant necessary permissions
GRANT ALL ON payments TO anon;
