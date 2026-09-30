-- Group availability and requested slot information for public sign-ups.
-- Run this in the Supabase SQL Editor after the sign-ups and slot-sharing migrations.

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS status VARCHAR(20);

-- Existing groups start closed. The column default makes newly created groups available.
UPDATE groups
SET status = 'closed'
WHERE status IS NULL;

ALTER TABLE groups
  ALTER COLUMN status SET DEFAULT 'available',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE groups
  DROP CONSTRAINT IF EXISTS groups_status_check;

ALTER TABLE groups
  ADD CONSTRAINT groups_status_check
  CHECK (status IN ('closed', 'available'));

ALTER TABLE member_signups
  ADD COLUMN IF NOT EXISTS group_id BIGINT REFERENCES groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slot_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS slot_duration INTEGER,
  ADD COLUMN IF NOT EXISTS desired_month VARCHAR(7);

ALTER TABLE member_signups
  DROP CONSTRAINT IF EXISTS member_signups_desired_month_check;

ALTER TABLE member_signups
  ADD CONSTRAINT member_signups_desired_month_check
  CHECK (desired_month IS NULL OR desired_month ~ '^\d{4}-\d{2}$');

CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_member_signups_group_id ON member_signups(group_id);

-- Close a group as soon as every month in its configured period is full.
-- Removing a member does not automatically reopen a group because an admin may
-- have closed it manually; an admin can explicitly make it available again.
CREATE OR REPLACE FUNCTION close_group_when_slots_full()
RETURNS TRIGGER AS $$
DECLARE
  target_group_id BIGINT;
  slot_capacity INTEGER;
  group_start VARCHAR(7);
  group_end VARCHAR(7);
  all_slots_full BOOLEAN;
BEGIN
  target_group_id := NEW.group_id;

  SELECT
    GREATEST(COALESCE(g.max_members_per_slot, 1), 1),
    g.start_date,
    g.end_date
  INTO slot_capacity, group_start, group_end
  FROM groups g
  WHERE g.id = target_group_id;

  IF group_start IS NOT NULL AND group_end IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1
      FROM generate_series(
        to_date(group_start || '-01', 'YYYY-MM-DD'),
        to_date(group_end || '-01', 'YYYY-MM-DD'),
        interval '1 month'
      ) AS slot_month
      WHERE (
        SELECT COUNT(*)
        FROM group_members gm
        WHERE gm.group_id = target_group_id
          AND gm.assigned_month_date = to_char(slot_month, 'YYYY-MM')
      ) < slot_capacity
    )
    INTO all_slots_full;

    IF all_slots_full THEN
      UPDATE groups
      SET status = 'closed'
      WHERE id = target_group_id
        AND status <> 'closed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_close_group_when_slots_full ON group_members;
CREATE TRIGGER tr_close_group_when_slots_full
  AFTER INSERT OR UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION close_group_when_slots_full();

