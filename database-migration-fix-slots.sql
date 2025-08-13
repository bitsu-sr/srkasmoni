-- Database Migration: Fix Multiple Slots per Member per Group
-- This migration removes the constraint that prevents members from having multiple slots in the same group

-- Drop the problematic unique constraint that prevents multiple slots per member per group
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_member_id_key;

-- The table should now allow:
-- 1. Multiple slots (months) for the same member in the same group
-- 2. Still prevent the same month from being assigned to multiple members (UNIQUE(group_id, assigned_month_date))

-- Verify the current constraints
-- You can run this query to see the remaining constraints:
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'group_members'::regclass;

-- The remaining constraint should be:
-- UNIQUE(group_id, assigned_month_date) - prevents double-booking of months
