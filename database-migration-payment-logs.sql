-- Database Migration for Payment Logs Functionality
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing objects to start fresh
DROP TRIGGER IF EXISTS log_payment_changes ON payments;
DROP FUNCTION IF EXISTS log_payment_change();
DROP TABLE IF EXISTS payment_logs CASCADE;

-- Step 2: Create payment_logs table with proper foreign key constraints
CREATE TABLE payment_logs (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT,
  member_id BIGINT REFERENCES members(id) ON DELETE SET NULL,
  group_id BIGINT REFERENCES groups(id) ON DELETE SET NULL,
  slot_id BIGINT REFERENCES payment_slots(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  old_amount DECIMAL(12,2),
  new_amount DECIMAL(12,2),
  old_payment_method VARCHAR(20),
  new_payment_method VARCHAR(20),
  old_notes TEXT,
  new_notes TEXT,
  old_payment_date DATE,
  new_payment_date DATE,
  old_sender_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  new_sender_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  old_receiver_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  new_receiver_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  changes_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create a comprehensive logging function
CREATE OR REPLACE FUNCTION log_payment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Log payment creation
    INSERT INTO payment_logs (
      payment_id, member_id, group_id, slot_id, action,
      new_status, new_amount, new_payment_method, new_notes,
      new_payment_date, new_sender_bank_id, new_receiver_bank_id,
      changes_summary
    ) VALUES (
      NEW.id, NEW.member_id, NEW.group_id, NEW.slot_id, 'created',
      NEW.status, NEW.amount, NEW.payment_method, NEW.notes,
      NEW.payment_date, NEW.sender_bank_id, NEW.receiver_bank_id,
      'Payment created'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log payment updates
    INSERT INTO payment_logs (
      payment_id, member_id, group_id, slot_id, action,
      old_status, new_status, old_amount, new_amount,
      old_payment_method, new_payment_method, old_notes, new_notes,
      old_payment_date, new_payment_date, old_sender_bank_id, new_sender_bank_id,
      old_receiver_bank_id, new_receiver_bank_id, changes_summary
    ) VALUES (
      NEW.id, NEW.member_id, NEW.group_id, NEW.slot_id, 'updated',
      OLD.status, NEW.status, OLD.amount, NEW.amount,
      OLD.payment_method, NEW.payment_method, OLD.notes, NEW.notes,
      OLD.payment_date, NEW.payment_date, OLD.sender_bank_id, NEW.sender_bank_id,
      OLD.receiver_bank_id, NEW.receiver_bank_id, 'Payment updated'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Log payment deletion
    INSERT INTO payment_logs (
      payment_id, member_id, group_id, slot_id, action,
      old_status, old_amount, old_payment_method, old_notes,
      old_payment_date, old_sender_bank_id, old_receiver_bank_id,
      changes_summary
    ) VALUES (
      OLD.id, OLD.member_id, OLD.group_id, OLD.slot_id, 'deleted',
      OLD.status, OLD.amount, OLD.payment_method, OLD.notes,
      OLD.payment_date, OLD.sender_bank_id, OLD.receiver_bank_id,
      'Payment deleted'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for all payment operations
CREATE TRIGGER log_payment_changes
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_payment_change();

-- Step 5: Enable RLS and create basic policies
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to payment_logs" ON payment_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to payment_logs" ON payment_logs
  FOR INSERT WITH CHECK (true);

-- Step 6: Grant permissions
GRANT ALL ON payment_logs TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
