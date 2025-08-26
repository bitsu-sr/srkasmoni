-- Fix RLS Policies for Password Reset Messages
-- Run this in Supabase SQL Editor to fix the "new row violates row-level security policy" error

-- Step 1: Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'messages';

-- Step 2: Check existing policies
SELECT policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'messages';

-- Step 3: Remove ALL existing policies that might block inserts
DROP POLICY IF EXISTS "Allow password reset message inserts" ON messages;
DROP POLICY IF EXISTS "Allow password reset message recipients" ON message_recipients;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON message_recipients;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON message_recipients;

-- Step 4: Create a simple, permissive policy for password reset messages
CREATE POLICY "Allow password reset messages" ON messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    (message_type = 'password_reset_request' AND sender_id = '00000000-0000-0000-0000-000000000000')
  );

-- Step 5: Create policy for message recipients
CREATE POLICY "Allow password reset recipients" ON message_recipients
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    message_id IN (
      SELECT id FROM messages 
      WHERE message_type = 'password_reset_request' 
      AND sender_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- Step 6: Grant permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON messages TO anon;
GRANT ALL ON message_recipients TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 7: Verify the policies were created
SELECT policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('messages', 'message_recipients')
ORDER BY tablename, policyname;
