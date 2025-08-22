-- Fix Row Level Security for group_members table
-- Run this in your Supabase SQL Editor

-- Enable RLS on group_members table if not already enabled
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to group_members
CREATE POLICY "Allow public read access to group_members" ON group_members
  FOR SELECT USING (true);

-- Create policy for public insert to group_members
CREATE POLICY "Allow public insert to group_members" ON group_members
  FOR INSERT WITH CHECK (true);

-- Create policy for public update to group_members
CREATE POLICY "Allow public update to group_members" ON group_members
  FOR UPDATE USING (true);

-- Create policy for public delete from group_members
CREATE POLICY "Allow public delete from group_members" ON group_members
  FOR DELETE USING (true);

-- Grant necessary permissions
GRANT ALL ON group_members TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

