-- Database Migration Script
-- Run this in your Supabase SQL Editor to update existing database

-- Step 1: Add new column to group_members table
ALTER TABLE group_members 
ADD COLUMN assigned_month_date VARCHAR(7) CHECK (assigned_month_date ~ '^\d{4}-\d{2}$');

-- Step 2: Update existing data to convert month numbers to dates
-- This assumes all existing groups started in 2024
UPDATE group_members 
SET assigned_month_date = CASE 
  WHEN assigned_month = 1 THEN '2024-01'
  WHEN assigned_month = 2 THEN '2024-02'
  WHEN assigned_month = 3 THEN '2024-03'
  WHEN assigned_month = 4 THEN '2024-04'
  WHEN assigned_month = 5 THEN '2024-05'
  WHEN assigned_month = 6 THEN '2024-06'
  WHEN assigned_month = 7 THEN '2024-07'
  WHEN assigned_month = 8 THEN '2024-08'
  WHEN assigned_month = 9 THEN '2024-09'
  WHEN assigned_month = 10 THEN '2024-10'
  WHEN assigned_month = 11 THEN '2024-11'
  WHEN assigned_month = 12 THEN '2024-12'
END;

-- Step 3: Make the new column NOT NULL
ALTER TABLE group_members 
ALTER COLUMN assigned_month_date SET NOT NULL;

-- Step 4: Drop the old column
ALTER TABLE group_members 
DROP COLUMN assigned_month;

-- Step 5: Rename the new column to the original name for compatibility
ALTER TABLE group_members 
RENAME COLUMN assigned_month_date TO assigned_month;

-- Step 6: Update the unique constraint
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_group_id_assigned_month_key;

ALTER TABLE group_members 
ADD CONSTRAINT group_members_group_id_assigned_month_key 
UNIQUE(group_id, assigned_month);

-- Step 7: Update groups table to use new date fields
-- First add the new columns
ALTER TABLE groups 
ADD COLUMN monthly_amount DECIMAL(12,2),
ADD COLUMN max_members INTEGER,
ADD COLUMN duration INTEGER,
ADD COLUMN start_date VARCHAR(7) CHECK (start_date ~ '^\d{4}-\d{2}$'),
ADD COLUMN end_date VARCHAR(7) CHECK (end_date ~ '^\d{4}-\d{2}$');

-- Set default values for existing groups
UPDATE groups 
SET 
  monthly_amount = 2000.00,
  max_members = 8,
  duration = 8,
  start_date = '2024-01',
  end_date = '2024-08'
WHERE monthly_amount IS NULL;

-- Make columns NOT NULL
ALTER TABLE groups 
ALTER COLUMN monthly_amount SET NOT NULL,
ALTER COLUMN max_members SET NOT NULL,
ALTER COLUMN duration SET NOT NULL,
ALTER COLUMN start_date SET NOT NULL,
ALTER COLUMN end_date SET NOT NULL;

-- Drop old columns
ALTER TABLE groups 
DROP COLUMN IF EXISTS start_month,
DROP COLUMN IF EXISTS end_month;

-- Update the sample data to use proper dates
UPDATE groups 
SET 
  start_date = '2024-01', end_date = '2024-08'
WHERE name = 'Group A';

UPDATE groups 
SET 
  start_date = '2024-03', end_date = '2024-08'
WHERE name = 'Group B';

UPDATE groups 
SET 
  start_date = '2024-01', end_date = '2024-12'
WHERE name = 'Group C';

UPDATE groups 
SET 
  start_date = '2024-02', end_date = '2024-11'
WHERE name = 'Group D';
