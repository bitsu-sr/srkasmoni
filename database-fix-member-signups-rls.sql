-- Fix public sign-up inserts (RLS 42501 / 401 Unauthorized)
-- Run this in the Supabase SQL Editor

-- Allow anonymous and logged-in users to submit a sign-up.
-- Do not grant them SELECT: sign-up PII should only be visible to admins.
DROP POLICY IF EXISTS "Anyone can submit member signups" ON member_signups;

CREATE POLICY "Anyone can submit member signups"
  ON member_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON TABLE member_signups TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE member_signups_id_seq TO anon, authenticated;
