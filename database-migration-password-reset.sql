-- Database Migration for Password Reset Requests
-- Run this in your Supabase SQL Editor to enable the forgot password functionality

-- ========================================
-- IMMEDIATE FIX FOR MESSAGES TABLE RLS
-- ========================================

-- This section fixes the immediate RLS policy issue for password reset messages
-- Run this FIRST to get the system working

-- Step 1: Fix the sender_ip_address column type (if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'sender_ip_address' 
    AND data_type = 'inet'
  ) THEN
    ALTER TABLE messages ALTER COLUMN sender_ip_address TYPE TEXT;
    RAISE NOTICE 'Changed sender_ip_address column from INET to TEXT';
  ELSE
    RAISE NOTICE 'sender_ip_address column is already TEXT or does not exist';
  END IF;
END $$;

-- Step 2: Set up RLS policies for password reset messages
-- Allow unauthenticated inserts for password reset messages
DROP POLICY IF EXISTS "Allow password reset message inserts" ON messages;
CREATE POLICY "Allow password reset message inserts" ON messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    (message_type = 'password_reset_request' AND sender_id = '00000000-0000-0000-0000-000000000000')
  );

-- Allow unauthenticated inserts for message recipients of password reset messages
DROP POLICY IF EXISTS "Allow password reset message recipients" ON message_recipients;
CREATE POLICY "Allow password reset message recipients" ON message_recipients
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    message_id IN (
      SELECT id FROM messages 
      WHERE message_type = 'password_reset_request' 
      AND sender_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- Step 3: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON messages TO anon;
GRANT ALL ON message_recipients TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ========================================
-- OLD PASSWORD RESET SYSTEM (DEPRECATED)
-- ========================================

-- Drop existing table if it exists (to recreate with correct policies)
DROP TABLE IF EXISTS password_reset_requests CASCADE;

-- Create password_reset_requests table
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'completed')),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_date TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  notes TEXT,
  ip_address TEXT, -- Changed from INET to TEXT for flexibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email ON password_reset_requests(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_date ON password_reset_requests(request_date);

-- Enable Row Level Security (RLS)
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert for password reset requests" ON password_reset_requests;
DROP POLICY IF EXISTS "Allow admins to view password reset requests" ON password_reset_requests;
DROP POLICY IF EXISTS "Allow admins to update password reset requests" ON password_reset_requests;

-- Allow public insert (for password reset requests from unauthenticated users)
CREATE POLICY "Allow public insert for password reset requests" ON password_reset_requests
  FOR INSERT WITH CHECK (true);

-- Allow admins to view all requests (using a simpler check that doesn't require auth.users access)
CREATE POLICY "Allow admins to view password reset requests" ON password_reset_requests
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Allow admins to update requests (using a simpler check that doesn't require auth.users access)
CREATE POLICY "Allow admins to update password reset requests" ON password_reset_requests
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON password_reset_requests TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Create a view for admins to easily see pending password reset requests
CREATE OR REPLACE VIEW pending_password_resets AS
SELECT 
  id,
  email,
  username,
  request_date,
  ip_address,
  created_at
FROM password_reset_requests 
WHERE status = 'pending'
ORDER BY request_date DESC;

-- Grant access to the view for admins
GRANT SELECT ON pending_password_resets TO anon;

-- ========================================
-- FIX FOR EXISTING TABLES (if you already ran the previous migration)
-- ========================================

-- If you already have the table and need to fix the ip_address column type, run this:

-- Step 1: Drop the view that depends on the column
DROP VIEW IF EXISTS pending_password_resets;

-- Step 2: Alter the ip_address column from INET to TEXT
ALTER TABLE password_reset_requests 
ALTER COLUMN ip_address TYPE TEXT;

-- Step 3: Recreate the view
CREATE OR REPLACE VIEW pending_password_resets AS
SELECT 
  id,
  email,
  username,
  request_date,
  ip_address,
  created_at
FROM password_reset_requests 
WHERE status = 'pending'
ORDER BY request_date DESC;

-- Step 4: Grant access to the recreated view
GRANT SELECT ON pending_password_resets TO anon;

-- ========================================
-- FIX MESSAGES TABLE COLUMN TYPE
-- ========================================

-- Fix the sender_ip_address column in the messages table
-- Change it from INET to TEXT to allow non-IP values like "Not tracked"

-- Step 1: Check if the column exists and its current type
DO $$
BEGIN
  -- Check if sender_ip_address column exists and is INET type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'sender_ip_address' 
    AND data_type = 'inet'
  ) THEN
    -- Alter the column from INET to TEXT
    ALTER TABLE messages ALTER COLUMN sender_ip_address TYPE TEXT;
    RAISE NOTICE 'Changed sender_ip_address column from INET to TEXT';
  ELSE
    RAISE NOTICE 'sender_ip_address column is already TEXT or does not exist';
  END IF;
END $$;

-- ========================================
-- CREATE SYSTEM USER FOR PASSWORD REQUESTS
-- ========================================

-- Create a system user specifically for password reset requests
-- This user will be used by the LoginModal to send messages to admins

-- For password reset messages, we'll use a simple approach:
-- Allow unauthenticated inserts with a special sender_id for system messages
-- This avoids the complexity of creating system users

-- Grant necessary permissions to the system user
-- (This user will only be used for sending password reset messages)

-- ========================================
-- UPDATE MESSAGE TYPES (if not already done)
-- ========================================

-- Ensure password_reset_request is a valid message type
-- This should already be in your message types enum, but adding here for completeness
-- ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'password_reset_request';

-- ========================================
-- RLS POLICIES FOR SYSTEM USER
-- ========================================

-- Allow unauthenticated inserts for password reset messages
-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Allow password reset message inserts" ON messages;
CREATE POLICY "Allow password reset message inserts" ON messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    (message_type = 'password_reset_request' AND sender_id = '00000000-0000-0000-0000-000000000000')
  );

-- Allow unauthenticated inserts for message recipients of password reset messages
DROP POLICY IF EXISTS "Allow password reset message recipients" ON message_recipients;
CREATE POLICY "Allow password reset message recipients" ON message_recipients
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    message_id IN (
      SELECT id FROM messages 
      WHERE message_type = 'password_reset_request' 
      AND sender_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- ========================================
-- TEST THE SYSTEM USER
-- ========================================

-- You can test if the password reset system is working:
-- 1. Try to insert a password reset message
-- 2. Check if the message was created successfully
-- 3. Verify the RLS policies are working correctly

-- ========================================
-- CLEANUP OLD PASSWORD RESET SYSTEM
-- ========================================

-- If you want to clean up the old password reset system, you can run these:

-- Drop the old password reset requests table (if it exists)
-- DROP TABLE IF EXISTS password_reset_requests CASCADE;

-- Drop the old view (if it exists)
-- DROP VIEW IF EXISTS pending_password_resets CASCADE;

-- Note: Only run the cleanup commands if you're sure you want to remove the old system
-- and have confirmed the new messaging-based system is working correctly.
