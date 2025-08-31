-- Database Migration: Add payouts table
-- This migration creates a new table to store payout details and settings

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  monthly_amount DECIMAL(12,2) NOT NULL,
  duration INTEGER NOT NULL,
  last_slot BOOLEAN DEFAULT FALSE,
  administration_fee BOOLEAN DEFAULT FALSE,
  payout BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per group-member-month combination
  UNIQUE(group_id, member_id, EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at))
);

-- Create indexes for better performance
CREATE INDEX idx_payouts_group_id ON payouts(group_id);
CREATE INDEX idx_payouts_member_id ON payouts(member_id);
CREATE INDEX idx_payouts_created_at ON payouts(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payouts_updated_at 
  BEFORE UPDATE ON payouts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Create policies for payouts table
CREATE POLICY "Allow authenticated users to read payouts" ON payouts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert payouts" ON payouts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update payouts" ON payouts
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Add some sample data for testing (optional - can be removed in production)
INSERT INTO payouts (group_id, member_id, monthly_amount, duration, last_slot, administration_fee, payout)
VALUES 
  (1, 1, 1000.00, 12, false, false, false),
  (1, 2, 1000.00, 12, true, false, false),
  (2, 3, 1500.00, 24, false, true, false)
ON CONFLICT DO NOTHING;
