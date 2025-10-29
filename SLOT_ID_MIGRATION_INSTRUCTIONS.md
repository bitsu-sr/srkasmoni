# Slot ID Migration Instructions

## Problem Fixed
This migration fixes the issue where members with multiple slots in the same group were sharing the same payout record. Now each slot gets its own independent payout record.

## Why Save/Payout Buttons Don't Work Yet
The code has been updated to use `slot_id`, but your database doesn't have the `slot_id` column yet. You need to run the migration first.

## How to Run the Migration

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run the Migration Script
1. Open the file `database-migration-add-slot-id-to-payouts.sql`
2. Copy the entire contents
3. Paste it into the Supabase SQL Editor
4. Click "Run" (or press Ctrl/Cmd + Enter)

### Step 3: Check for Warnings
The migration will automatically:
- Add the `slot_id` column
- Try to match existing payout records to slots
- Display a warning if any records couldn't be matched

If you see a warning about orphaned records, you have two options:

**Option A: Delete orphaned records (recommended)**
```sql
DELETE FROM payouts WHERE slot_id IS NULL;
```

**Option B: View orphaned records first**
```sql
SELECT * FROM payouts WHERE slot_id IS NULL;
```

### Step 4: Set NOT NULL Constraint (After Verifying)
After confirming there are no NULL slot_id records, run:
```sql
ALTER TABLE payouts 
ALTER COLUMN slot_id SET NOT NULL;
```

### Step 5: Verify the Migration
Run this query to verify everything is working:
```sql
SELECT 
  p.id as payout_id,
  p.slot_id,
  p.group_id,
  p.member_id,
  p.payout_month,
  gm.assigned_month_date,
  m.first_name || ' ' || m.last_name as member_name,
  g.name as group_name
FROM payouts p
JOIN group_members gm ON p.slot_id = gm.id
JOIN members m ON p.member_id = m.id
JOIN groups g ON p.group_id = g.id
ORDER BY p.id;
```

If this query returns all your payout records successfully, the migration is complete!

## After Migration
Once the migration is complete, the Save and Payout buttons in your application will work correctly. Each slot will now have its own independent payout record.

## Troubleshooting

### Error: "column slot_id already exists"
The migration has already been partially run. Check the current state:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payouts' AND column_name = 'slot_id';
```

### Error: "column slot_id cannot be null"
Some records don't have slot_id set. View them:
```sql
SELECT * FROM payouts WHERE slot_id IS NULL;
```

Then either fix them manually or delete them.

### Need to Rollback
If something goes wrong and you need to rollback:
```sql
-- Drop the new constraint
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_slot_id_key;

-- Drop the index
DROP INDEX IF EXISTS idx_payouts_slot_id;

-- Drop the column
ALTER TABLE payouts DROP COLUMN IF EXISTS slot_id;

-- Restore the old constraint
ALTER TABLE payouts ADD CONSTRAINT payouts_group_id_member_id_key UNIQUE(group_id, member_id);
```

Note: Only do this if absolutely necessary, as you'll need to revert the code changes too.

