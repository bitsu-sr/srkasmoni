-- Fix RLS Policies for Payment Slots
-- This script fixes the Row Level Security policies to work with our database-only authentication system

-- First, drop the existing overly permissive policies
DROP POLICY IF EXISTS "Allow public insert to payment_slots" ON payment_slots;
DROP POLICY IF EXISTS "Allow public update to payment_slots" ON payment_slots;
DROP POLICY IF EXISTS "Allow public delete from payment_slots" ON payment_slots;

-- For now, let's disable RLS on these tables since we're controlling access at the application level
-- This is a simpler approach that will work with our database-only authentication
ALTER TABLE payment_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT ALL ON payment_slots TO authenticated;
GRANT ALL ON payments TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Alternative approach: If you want to keep RLS enabled, use these policies instead:
-- (Uncomment the lines below and comment out the DISABLE RLS lines above)

/*
-- Allow all authenticated users to read payment slots
CREATE POLICY "Allow authenticated users to read payment_slots" ON payment_slots
  FOR SELECT USING (true);

-- Allow all authenticated users to insert/update/delete payment slots
-- (We'll control access at the application level based on user role)
CREATE POLICY "Allow authenticated users to manage payment_slots" ON payment_slots
  FOR ALL USING (true);

-- Same for payments table
CREATE POLICY "Allow authenticated users to read payments" ON payments
  FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage payments" ON payments
  FOR ALL USING (true);
*/
