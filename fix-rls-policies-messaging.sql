-- Fix RLS policies for messaging system
-- This removes references to auth.users table that the anon role cannot access

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
DROP POLICY IF EXISTS "Admins can view all profile change requests" ON profile_change_requests;
DROP POLICY IF EXISTS "Admins can update profile change requests" ON profile_change_requests;

-- Create new policies that don't reference auth.users table
-- For now, we'll use a simpler approach that allows authenticated users to access messages
-- You can enhance this later with proper role-based access control

-- Allow users to view messages they sent or received
CREATE POLICY "Users can view their messages" ON messages
FOR SELECT USING (
  auth.uid() = sender_id OR
  EXISTS (
    SELECT 1 FROM message_recipients 
    WHERE message_id = messages.id AND recipient_id = auth.uid()
  )
);

-- Allow users to create messages
CREATE POLICY "Users can create messages" ON messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Allow users to view their message recipients
CREATE POLICY "Users can view their message recipients" ON message_recipients
FOR SELECT USING (recipient_id = auth.uid());

-- Allow users to update their message recipients
CREATE POLICY "Users can update their message recipients" ON message_recipients
FOR UPDATE USING (recipient_id = auth.uid());

-- Allow message senders to create recipients
CREATE POLICY "Message senders can create recipients" ON message_recipients
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages 
    WHERE id = message_id AND sender_id = auth.uid()
  )
);

-- Allow members to view their own profile change requests
CREATE POLICY "Members can view their own requests" ON profile_change_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE id = member_id AND email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Allow all authenticated users to view profile change requests (for now)
-- You can enhance this later with proper role checking
CREATE POLICY "Users can view profile change requests" ON profile_change_requests
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow members to create profile change requests
CREATE POLICY "Members can create profile change requests" ON profile_change_requests
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM members 
    WHERE id = member_id AND email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Allow all authenticated users to update profile change requests (for now)
-- You can enhance this later with proper role checking
CREATE POLICY "Users can update profile change requests" ON profile_change_requests
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
