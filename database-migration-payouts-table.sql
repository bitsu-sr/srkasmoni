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
  additional_cost DECIMAL(12,2) DEFAULT 0,
  payout_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per group-member combination
  UNIQUE(group_id, member_id)
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

-- Sample data removed - add your own test data after creating groups and members
-- Example:
-- INSERT INTO payouts (group_id, member_id, monthly_amount, duration, last_slot, administration_fee, payout, additional_cost, payout_date)
-- VALUES 
--   (your_group_id, your_member_id, 1000.00, 12, false, false, false, 0.00, CURRENT_DATE)
-- ON CONFLICT DO NOTHING;
