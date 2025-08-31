-- Migration: Add transferred column to Payments table
-- Date: 2024-12-19
-- Description: Adds a boolean column 'transferred' to track if payment has been transferred to recipient

-- Add the new column with default value false
ALTER TABLE "Payments" 
ADD COLUMN "transferred" BOOLEAN NOT NULL DEFAULT false;

-- Update existing records to have transferred = false
UPDATE "Payments" 
SET "transferred" = false 
WHERE "transferred" IS NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN "Payments"."transferred" IS 'Indicates whether the total amount from all slots in the group has been transferred to the payment month recipient';
