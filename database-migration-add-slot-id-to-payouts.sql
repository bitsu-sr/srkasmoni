-- Database Migration: Add slot_id to payouts table
-- This migration fixes the issue where members with multiple slots in the same group
-- share the same payout record. Now each slot gets its own payout record.

-- Step 1: Add slot_id column (nullable for now to allow existing data)
ALTER TABLE payouts 
ADD COLUMN slot_id BIGINT REFERENCES group_members(id) ON DELETE CASCADE;

-- Step 2: For existing records, try to match them to slots based on group_id, member_id, and payout_month
-- This is a best-effort migration. Manual review may be needed for edge cases.
UPDATE payouts p
SET slot_id = gm.id
FROM group_members gm
WHERE p.group_id = gm.group_id 
  AND p.member_id = gm.member_id
  AND p.payout_month = gm.assigned_month_date
  AND p.slot_id IS NULL;

-- Step 3: For any remaining NULL slot_id records (ambiguous cases), 
-- match to the first slot found for that member in that group
UPDATE payouts p
SET slot_id = (
  SELECT gm.id 
  FROM group_members gm
  WHERE gm.group_id = p.group_id 
    AND gm.member_id = p.member_id
  ORDER BY gm.assigned_month_date ASC
  LIMIT 1
)
WHERE p.slot_id IS NULL;

-- Step 3.5: Check if there are any records that still don't have slot_id
-- If there are any orphaned records (member/group combinations that don't exist in group_members),
-- they should be manually reviewed or deleted
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count FROM payouts WHERE slot_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % payout records that could not be matched to slots. These records may be orphaned.', orphaned_count;
    RAISE NOTICE 'You can view them with: SELECT * FROM payouts WHERE slot_id IS NULL;';
    RAISE NOTICE 'Consider deleting orphaned records with: DELETE FROM payouts WHERE slot_id IS NULL;';
  END IF;
END $$;

-- Step 4: Delete any orphaned records (optional - uncomment if you want to auto-delete)
-- DELETE FROM payouts WHERE slot_id IS NULL;

-- Step 4.5: Make slot_id NOT NULL now that all records have been populated
-- Only run this after confirming there are no NULL slot_id records
-- Uncomment the next 2 lines after verifying there are no orphaned records:
-- ALTER TABLE payouts 
-- ALTER COLUMN slot_id SET NOT NULL;
-- 
-- After setting NOT NULL, you can optionally add a proper constraint:
-- ALTER TABLE payouts ADD CONSTRAINT payouts_slot_id_key UNIQUE(slot_id);

-- Step 5: Drop the old unique constraint on (group_id, member_id)
ALTER TABLE payouts 
DROP CONSTRAINT IF EXISTS payouts_group_id_member_id_key;

-- Step 6: Add new unique constraint on slot_id
-- This ensures each slot can only have one payout record
-- Using a partial unique index to allow NULL values during migration
CREATE UNIQUE INDEX IF NOT EXISTS payouts_slot_id_unique_idx 
ON payouts(slot_id) 
WHERE slot_id IS NOT NULL;

-- Step 7: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_payouts_slot_id ON payouts(slot_id);

-- Step 8: Update the index strategy - we can drop some redundant indexes now
-- Keep the slot_id index as it's the primary lookup key now
-- The group_id and member_id indexes are less critical but can stay for reporting queries

-- Verification query - uncomment to check that all payouts now have valid slot_ids:
-- SELECT 
--   p.id as payout_id,
--   p.slot_id,
--   p.group_id,
--   p.member_id,
--   p.payout_month,
--   gm.assigned_month_date,
--   m.first_name || ' ' || m.last_name as member_name,
--   g.name as group_name
-- FROM payouts p
-- JOIN group_members gm ON p.slot_id = gm.id
-- JOIN members m ON p.member_id = m.id
-- JOIN groups g ON p.group_id = g.id
-- ORDER BY p.id;

