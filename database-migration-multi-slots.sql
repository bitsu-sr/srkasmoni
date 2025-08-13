-- Database Migration Script for Multi-Slot Support
-- Run this in your Supabase SQL Editor to allow members to have multiple slots

-- Step 1: Remove the unique constraint that prevents a member from being in the same group multiple times
-- This allows a member to have multiple slots (months) in the same group
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_group_id_member_id_key;

-- Step 2: Keep the unique constraint on (group_id, assigned_month_date) 
-- This ensures each month slot can only be assigned to one member
-- (This constraint should already exist from the previous migration)

-- Step 3: Add an index to improve performance for queries that look up member slots
CREATE INDEX IF NOT EXISTS idx_group_members_member_group 
ON group_members(member_id, group_id);

-- Step 4: Add an index for month-based queries
CREATE INDEX IF NOT EXISTS idx_group_members_month 
ON group_members(group_id, assigned_month_date);

-- Note: The existing unique constraint on (group_id, assigned_month_date) remains
-- This ensures that each month slot in a group can only be assigned to one member
-- But a member can now have multiple slots in the same group
