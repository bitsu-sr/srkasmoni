-- Database Migration: Complete slot_id Migration (Step 2)
-- Run this if the slot_id column already exists but needs to be populated and constrained

-- Step 1: Populate slot_id for existing records based on payout_month matching assigned_month_date
UPDATE payouts p
SET slot_id = gm.id
FROM group_members gm
WHERE p.group_id = gm.group_id 
  AND p.member_id = gm.member_id
  AND p.payout_month = gm.assigned_month_date
  AND p.slot_id IS NULL;

-- Step 2: For any remaining NULL slot_id records (ambiguous cases), 
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

-- Step 3: Check if there are any records that still don't have slot_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count FROM payouts WHERE slot_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % payout records that could not be matched to slots.', orphaned_count;
    RAISE NOTICE 'View them with: SELECT * FROM payouts WHERE slot_id IS NULL;';
    RAISE NOTICE 'Delete them with: DELETE FROM payouts WHERE slot_id IS NULL;';
  ELSE
    RAISE NOTICE 'SUCCESS: All payout records have been matched to slots!';
  END IF;
END $$;

-- Step 4: Delete any orphaned records (uncomment if needed)
-- DELETE FROM payouts WHERE slot_id IS NULL;

-- Step 5: Drop the old unique constraint on (group_id, member_id)
ALTER TABLE payouts 
DROP CONSTRAINT IF EXISTS payouts_group_id_member_id_key;

-- Step 6: Create unique index on slot_id (partial index to allow NULLs during migration)
CREATE UNIQUE INDEX IF NOT EXISTS payouts_slot_id_unique_idx 
ON payouts(slot_id) 
WHERE slot_id IS NOT NULL;

-- Step 7: Create regular index for better query performance
CREATE INDEX IF NOT EXISTS idx_payouts_slot_id ON payouts(slot_id);

-- Step 8: Verify the migration
DO $$
DECLARE
  total_payouts INTEGER;
  payouts_with_slots INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_payouts FROM payouts;
  SELECT COUNT(*) INTO payouts_with_slots FROM payouts WHERE slot_id IS NOT NULL;
  
  RAISE NOTICE 'Migration Status:';
  RAISE NOTICE '  Total payout records: %', total_payouts;
  RAISE NOTICE '  Records with slot_id: %', payouts_with_slots;
  
  IF total_payouts = payouts_with_slots THEN
    RAISE NOTICE '✓ All records migrated successfully!';
    RAISE NOTICE 'You can now set NOT NULL constraint with:';
    RAISE NOTICE '  ALTER TABLE payouts ALTER COLUMN slot_id SET NOT NULL;';
  ELSE
    RAISE NOTICE '⚠ % records still need slot_id', (total_payouts - payouts_with_slots);
  END IF;
END $$;

-- Step 9: OPTIONAL - Set NOT NULL constraint (uncomment after verifying all records have slot_id)
-- ALTER TABLE payouts ALTER COLUMN slot_id SET NOT NULL;
-- 
-- After setting NOT NULL, you can add a proper constraint:
-- ALTER TABLE payouts ADD CONSTRAINT payouts_slot_id_key UNIQUE(slot_id);

