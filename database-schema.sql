-- Database Schema for SR Kasmoni Application
-- Run this in your Supabase SQL Editor

-- Note: Row Level Security is enabled by default in Supabase
-- The app.jwt_secret setting is not needed for basic functionality

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  monthly_amount DECIMAL(12,2) NOT NULL,
  max_members INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  start_date VARCHAR(7) NOT NULL CHECK (start_date ~ '^\d{4}-\d{2}$'),
  end_date VARCHAR(7) NOT NULL CHECK (end_date ~ '^\d{4}-\d{2}$'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_members table to track which members are in which groups
CREATE TABLE IF NOT EXISTS group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
  member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  assigned_month_date VARCHAR(7) NOT NULL CHECK (assigned_month_date ~ '^\d{4}-\d{2}$'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Note: Removed UNIQUE(group_id, member_id) to allow multiple slots per member per group
  -- This allows members to have multiple monthly slots in the same group
  UNIQUE(group_id, assigned_month_date)
);

-- Create members table
CREATE TABLE members (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
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
  date_of_registration DATE NOT NULL DEFAULT CURRENT_DATE,
  groups TEXT[] DEFAULT '{}',
  total_paid DECIMAL(12,2) DEFAULT 0,
  total_received DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'overdue', 'inactive')),
  last_payment DATE,
  next_payment DATE,
  join_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_national_id ON members(national_id);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_city ON members(city);
CREATE INDEX idx_members_groups ON members USING GIN(groups);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_groups_updated_at 
  BEFORE UPDATE ON groups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at 
  BEFORE UPDATE ON members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- Enable Row Level Security (RLS)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (you can modify these based on your security needs)
CREATE POLICY "Allow public read access to groups" ON groups
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to members" ON members
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to members" ON members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to members" ON members
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete from members" ON members
  FOR DELETE USING (true);

-- Create a view for member statistics
CREATE OR REPLACE VIEW member_stats AS
SELECT 
  COUNT(*) as total_members,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_members,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_members,
  COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_members,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_members,
  SUM(total_paid) as total_paid_amount,
  SUM(total_received) as total_received_amount,
  AVG(total_paid) as avg_paid_amount
FROM members;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
