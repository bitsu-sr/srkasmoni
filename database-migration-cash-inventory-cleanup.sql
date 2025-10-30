-- Cleanup script for cash_inventory table
-- Run this first if you get errors about existing objects

-- Drop trigger first
DROP TRIGGER IF EXISTS cash_inventory_updated_at ON cash_inventory;

-- Drop function
DROP FUNCTION IF EXISTS update_cash_inventory_updated_at();

-- Drop the table (CASCADE will drop all dependent objects including policies)
DROP TABLE IF EXISTS cash_inventory CASCADE;

-- Verify cleanup
SELECT 'Cleanup complete - you can now run the full migration' AS status;

