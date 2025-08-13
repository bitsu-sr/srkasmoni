-- Database Migration for Payments Functionality
-- Run this in your Supabase SQL Editor

-- Create payment_slots table to track member slots in groups
CREATE TABLE IF NOT EXISTS payment_slots (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
  member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  month_date VARCHAR(7) NOT NULL CHECK (month_date ~ '^\d{4}-\d{2}$'),
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, member_id, month_date)
);

-- Create payments table to store payment records
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
  slot_id BIGINT REFERENCES payment_slots(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer')),
  sender_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  receiver_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('not_paid', 'pending', 'received', 'settled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_payment_slots_group_member ON payment_slots(group_id, member_id);
CREATE INDEX idx_payment_slots_month_date ON payment_slots(month_date);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_group_id ON payments(group_id);
CREATE INDEX idx_payments_slot_id ON payments(slot_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Create trigger to automatically update updated_at timestamp for payments
CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE payment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (modify based on your security needs)
CREATE POLICY "Allow public read access to payment_slots" ON payment_slots
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to payment_slots" ON payment_slots
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to payment_slots" ON payment_slots
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete from payment_slots" ON payment_slots
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access to payments" ON payments
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to payments" ON payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to payments" ON payments
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete from payments" ON payments
  FOR DELETE USING (true);

-- Grant necessary permissions
GRANT ALL ON payment_slots TO anon;
GRANT ALL ON payments TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
