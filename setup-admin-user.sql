-- Setup Admin User Script
-- Run this AFTER running the main database-migration-auth.sql script

-- Step 1: Check if auth_users table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_users') 
    THEN 'auth_users table exists' 
    ELSE 'auth_users table does not exist - run database-migration-auth.sql first' 
  END as table_status;

-- Step 2: Check if admin user exists in Supabase Auth
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@system.local') 
    THEN 'Admin user exists in Supabase Auth' 
    ELSE 'Admin user does not exist in Supabase Auth - create it manually first' 
  END as auth_status;

-- Step 3: Check if admin user exists in auth_users table
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth_users WHERE username = 'admin') 
    THEN 'Admin user exists in auth_users table' 
    ELSE 'Admin user does not exist in auth_users table' 
  END as table_user_status;

-- Step 4: Insert admin user if not exists (only run this if the user exists in Supabase Auth)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@system.local') THEN
    IF NOT EXISTS (SELECT 1 FROM auth_users WHERE username = 'admin') THEN
      INSERT INTO auth_users (id, username, email, first_name, last_name, role) 
      VALUES (
        (SELECT id FROM auth.users WHERE email = 'admin@system.local'),
        'admin',
        'admin@system.local',
        'System',
        'Administrator',
        'admin'
      );
      RAISE NOTICE 'Admin user inserted into auth_users table';
    ELSE
      RAISE NOTICE 'Admin user already exists in auth_users table';
    END IF;
  ELSE
    RAISE NOTICE 'Admin user does not exist in Supabase Auth - create it manually first';
  END IF;
END $$;

-- Step 5: Verify admin user setup
SELECT 
  username,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM auth_users 
WHERE username = 'admin';
