-- Database Migration: Middle name + public member sign-ups
-- Run this in your Supabase SQL Editor

-- Add optional middle name to existing members
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100) DEFAULT '';

-- Public sign-up submissions (not members until an admin approves)
CREATE TABLE IF NOT EXISTS member_signups (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) DEFAULT '',
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  birthplace VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  national_id VARCHAR(50) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  occupation VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_signups_created_at ON member_signups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_signups_email ON member_signups(email);
CREATE INDEX IF NOT EXISTS idx_member_signups_national_id ON member_signups(national_id);

DROP TRIGGER IF EXISTS update_member_signups_updated_at ON member_signups;
CREATE TRIGGER update_member_signups_updated_at
  BEFORE UPDATE ON member_signups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE member_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit member signups" ON member_signups;
DROP POLICY IF EXISTS "Only admins can view member signups" ON member_signups;
DROP POLICY IF EXISTS "Only admins can update member signups" ON member_signups;
DROP POLICY IF EXISTS "Only admins can delete member signups" ON member_signups;

CREATE POLICY "Anyone can submit member signups" ON member_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can view member signups" ON member_signups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update member signups" ON member_signups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete member signups" ON member_signups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

GRANT INSERT ON member_signups TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON member_signups TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE member_signups_id_seq TO anon, authenticated;
