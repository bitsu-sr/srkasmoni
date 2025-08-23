-- Fix RLS Policies for auth_users table
-- This script fixes the infinite recursion issue in the RLS policies

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON auth_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON auth_users;
DROP POLICY IF EXISTS "Admins can view all users" ON auth_users;
DROP POLICY IF EXISTS "Admins can create users" ON auth_users;
DROP POLICY IF EXISTS "Admins can update all users" ON auth_users;
DROP POLICY IF EXISTS "Admins can delete users" ON auth_users;

-- Step 2: Create simplified policies that don't cause recursion
-- Policy: Users can view their own profile (using direct auth.uid() comparison)
CREATE POLICY "Users can view their own profile" ON auth_users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Policy: Users can update their own profile (using direct auth.uid() comparison)
CREATE POLICY "Users can update their own profile" ON auth_users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy: Everyone can view all users (temporary, for debugging)
CREATE POLICY "Everyone can view all users" ON auth_users
  FOR SELECT USING (true);

-- Policy: Only authenticated users can create users (temporary, for debugging)
CREATE POLICY "Authenticated users can create users" ON auth_users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only authenticated users can update users (temporary, for debugging)
CREATE POLICY "Authenticated users can update users" ON auth_users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can delete users (temporary, for debugging)
CREATE POLICY "Authenticated users can delete users" ON auth_users
  FOR DELETE USING (auth.role() = 'authenticated');

-- Step 3: Verify the policies are working
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'auth_users';

-- Step 4: Test if the table is accessible
SELECT COUNT(*) as user_count FROM auth_users;
