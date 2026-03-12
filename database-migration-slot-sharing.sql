-- Database Migration: Allow multiple members per slot (group/month)
-- Enables slot sharing: e.g. February can have John + Angela, each receiving 250 when monthly is 500

-- Step 1: Add max_members_per_slot to groups (default 2 = allow up to 2 people per slot)
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS max_members_per_slot INTEGER NOT NULL DEFAULT 2
CHECK (max_members_per_slot >= 1 AND max_members_per_slot <= 20);

COMMENT ON COLUMN groups.max_members_per_slot IS 'Max members that can share one slot (group/month). Default 2.';

-- Step 2: Drop the unique constraint that enforced one member per month
-- (PostgreSQL may have named it group_members_group_id_assigned_month_date_key or similar)
ALTER TABLE group_members
DROP CONSTRAINT IF EXISTS group_members_group_id_assigned_month_date_key;

ALTER TABLE group_members
DROP CONSTRAINT IF EXISTS group_members_group_id_assigned_month_key;

-- Step 3: Index to speed up "members per slot" queries
CREATE INDEX IF NOT EXISTS idx_group_members_group_month
ON group_members(group_id, assigned_month_date);

-- Step 4: Trigger to enforce max_members_per_slot per (group_id, assigned_month_date)
CREATE OR REPLACE FUNCTION check_max_members_per_slot()
RETURNS TRIGGER AS $$
DECLARE
  max_per_slot INTEGER;
  current_count INTEGER;
BEGIN
  SELECT g.max_members_per_slot INTO max_per_slot
  FROM groups g WHERE g.id = NEW.group_id;

  IF max_per_slot IS NULL THEN
    max_per_slot := 2;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM group_members
  WHERE group_id = NEW.group_id AND assigned_month_date = NEW.assigned_month_date;

  IF current_count >= max_per_slot THEN
    RAISE EXCEPTION 'This slot (month) already has the maximum number of members (%)', max_per_slot;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_max_members_per_slot ON group_members;
CREATE TRIGGER tr_check_max_members_per_slot
  BEFORE INSERT ON group_members
  FOR EACH ROW EXECUTE PROCEDURE check_max_members_per_slot();
