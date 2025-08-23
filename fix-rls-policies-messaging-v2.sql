-- Fix RLS policies for messaging system - Version 2
-- This only fixes the problematic policies that reference auth.users table

-- First, let's see what policies currently exist
-- You can run this to check: SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('messages', 'message_recipients', 'profile_change_requests');

-- Drop ONLY the problematic policies that reference auth.users table
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
DROP POLICY IF EXISTS "Admins can view all profile change requests" ON profile_change_requests;
DROP POLICY IF EXISTS "Admins can update profile change requests" ON profile_change_requests;

-- Create a simple policy to allow all authenticated users to view messages (temporary fix)
-- This replaces the problematic admin policy
CREATE POLICY "Allow authenticated users to view messages" ON messages
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create a simple policy to allow all authenticated users to view profile change requests (temporary fix)
-- This replaces the problematic admin policy
CREATE POLICY "Allow authenticated users to view profile change requests" ON profile_change_requests
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create a simple policy to allow all authenticated users to update profile change requests (temporary fix)
-- This replaces the problematic admin policy
CREATE POLICY "Allow authenticated users to update profile change requests" ON profile_change_requests
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Note: The existing policies for users viewing their own messages and creating messages should remain intact
-- This fix only addresses the admin-related policies that were causing 403 errors
