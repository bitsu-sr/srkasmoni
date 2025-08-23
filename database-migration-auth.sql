-- Database Migration for Authentication System
-- Run this in your Supabase SQL Editor

-- Step 1: Create auth_users table
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'super_user', 'member')),
  profile_picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auth_users_updated_at 
  BEFORE UPDATE ON auth_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 2: Insert the initial system admin user
-- Password: Admin#123 (you'll need to create this user in Supabase Auth manually)
INSERT INTO auth_users (username, email, first_name, last_name, role) 
VALUES ('admin', 'admin@system.local', 'System', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Step 3: Enable Row Level Security (RLS) for auth_users
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;

-- Create policies for auth_users
CREATE POLICY "Users can view their own profile" ON auth_users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON auth_users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON auth_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth_users 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create users" ON auth_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_users 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON auth_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth_users 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users" ON auth_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth_users 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- Step 4: Create helper functions
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID DEFAULT NULL)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF user_id IS NULL THEN
    user_id := auth.uid();
  END IF;
  
  RETURN (
    SELECT role 
    FROM auth_users 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_user(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_id) IN ('admin', 'super_user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Add created_by column to existing tables (only if they exist)
-- Groups table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'created_by') THEN
      ALTER TABLE groups ADD COLUMN created_by UUID REFERENCES auth_users(id);
      CREATE INDEX idx_groups_created_by ON groups(created_by);
    END IF;
  END IF;
END $$;

-- Members table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'created_by') THEN
      ALTER TABLE members ADD COLUMN created_by UUID REFERENCES auth_users(id);
      CREATE INDEX idx_members_created_by ON members(created_by);
    END IF;
  END IF;
END $$;

-- Payment slots table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_slots') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_slots' AND column_name = 'created_by') THEN
      ALTER TABLE payment_slots ADD COLUMN created_by UUID REFERENCES auth_users(id);
      CREATE INDEX idx_payment_slots_created_by ON payment_slots(created_by);
    END IF;
  END IF;
END $$;

-- Payments table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'created_by') THEN
      ALTER TABLE payments ADD COLUMN created_by UUID REFERENCES auth_users(id);
      CREATE INDEX idx_payments_created_by ON payments(created_by);
    END IF;
  END IF;
END $$;

-- Banks table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banks' AND column_name = 'created_by') THEN
      ALTER TABLE banks ADD COLUMN created_by UUID REFERENCES auth_users(id);
      CREATE INDEX idx_banks_created_by ON banks(created_by);
    END IF;
  END IF;
END $$;

-- Payment logs table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_logs' AND column_name = 'created_by') THEN
      ALTER TABLE payment_logs ADD COLUMN created_by UUID REFERENCES auth_users(id);
      CREATE INDEX idx_payment_logs_created_by ON payment_logs(created_by);
    END IF;
  END IF;
END $$;

-- Group members table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_members' AND column_name = 'created_by') THEN
      ALTER TABLE group_members ADD COLUMN created_by UUID REFERENCES auth_users(id);
      CREATE INDEX idx_group_members_created_by ON group_members(created_by);
    END IF;
  END IF;
END $$;

-- Step 6: Update existing records to set created_by to system admin (only if tables exist)
DO $$ 
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth_users WHERE username = 'admin' LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    -- Update groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
      UPDATE groups SET created_by = admin_id WHERE created_by IS NULL;
    END IF;
    
    -- Update members
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
      UPDATE members SET created_by = admin_id WHERE created_by IS NULL;
    END IF;
    
    -- Update payment_slots
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_slots') THEN
      UPDATE payment_slots SET created_by = admin_id WHERE created_by IS NULL;
    END IF;
    
    -- Update payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
      UPDATE payments SET created_by = admin_id WHERE created_by IS NULL;
    END IF;
    
    -- Update banks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banks') THEN
      UPDATE banks SET created_by = admin_id WHERE created_by IS NULL;
    END IF;
    
    -- Update payment_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_logs') THEN
      UPDATE payment_logs SET created_by = admin_id WHERE created_by IS NULL;
    END IF;
    
    -- Update group_members
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') THEN
      UPDATE group_members SET created_by = admin_id WHERE created_by IS NULL;
    END IF;
  END IF;
END $$;

-- Step 7: Enable RLS and create policies for existing tables (only if they exist)
-- Groups table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow public read access to groups" ON groups;
    DROP POLICY IF EXISTS "Allow public insert to groups" ON groups;
    DROP POLICY IF EXISTS "Allow public update to groups" ON groups;
    DROP POLICY IF EXISTS "Allow public delete from groups" ON groups;
    
    -- Create new policies
    CREATE POLICY "Everyone can view groups" ON groups
      FOR SELECT USING (true);
    
    CREATE POLICY "Only admins can create groups" ON groups
      FOR INSERT WITH CHECK (is_admin());
    
    CREATE POLICY "Only admins can update groups" ON groups
      FOR UPDATE USING (is_admin());
    
    CREATE POLICY "Only admins can delete groups" ON groups
      FOR DELETE USING (is_admin());
  END IF;
END $$;

-- Members table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE members ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow public read access to members" ON members;
    DROP POLICY IF EXISTS "Allow public insert to members" ON members;
    DROP POLICY IF EXISTS "Allow public update to members" ON members;
    DROP POLICY IF EXISTS "Allow public delete from members" ON members;
    
    -- Create new policies
    CREATE POLICY "Everyone can view members" ON members
      FOR SELECT USING (true);
    
    CREATE POLICY "Only admins can create members" ON members
      FOR INSERT WITH CHECK (is_admin());
    
    CREATE POLICY "Only admins can update members" ON members
      FOR UPDATE USING (is_admin());
    
    CREATE POLICY "Only admins can delete members" ON members
      FOR DELETE USING (is_admin());
  END IF;
END $$;

-- Payment slots table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_slots') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE payment_slots ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow public read access to payment_slots" ON payment_slots;
    DROP POLICY IF EXISTS "Allow public insert to payment_slots" ON payment_slots;
    DROP POLICY IF EXISTS "Allow public update to payment_slots" ON payment_slots;
    DROP POLICY IF EXISTS "Allow public delete from payment_slots" ON payment_slots;
    
    -- Create new policies
    CREATE POLICY "Everyone can view payment slots" ON payment_slots
      FOR SELECT USING (true);
    
    CREATE POLICY "Only admins can create payment slots" ON payment_slots
      FOR INSERT WITH CHECK (is_admin());
    
    CREATE POLICY "Only admins can update payment slots" ON payment_slots
      FOR UPDATE USING (is_admin());
    
    CREATE POLICY "Only admins can delete payment slots" ON payment_slots
      FOR DELETE USING (is_admin());
  END IF;
END $$;

-- Payments table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow public read access to payments" ON payments;
    DROP POLICY IF EXISTS "Allow public insert to payments" ON payments;
    DROP POLICY IF EXISTS "Allow public update to payments" ON payments;
    DROP POLICY IF EXISTS "Allow public delete from payments" ON payments;
    
    -- Create new policies
    CREATE POLICY "Everyone can view payments" ON payments
      FOR SELECT USING (true);
    
    CREATE POLICY "Only admins can create payments" ON payments
      FOR INSERT WITH CHECK (is_admin());
    
    CREATE POLICY "Only admins can update payments" ON payments
      FOR UPDATE USING (is_admin());
    
    CREATE POLICY "Only admins can delete payments" ON payments
      FOR DELETE USING (is_admin());
  END IF;
END $$;

-- Banks table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banks') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow public read access to banks" ON banks;
    DROP POLICY IF EXISTS "Allow public insert to banks" ON banks;
    DROP POLICY IF EXISTS "Allow public update to banks" ON banks;
    DROP POLICY IF EXISTS "Allow public delete from banks" ON banks;
    
    -- Create new policies
    CREATE POLICY "Everyone can view banks" ON banks
      FOR SELECT USING (true);
    
    CREATE POLICY "Only admins can create banks" ON banks
      FOR INSERT WITH CHECK (is_admin());
    
    CREATE POLICY "Only admins can update banks" ON banks
      FOR UPDATE USING (is_admin());
    
    CREATE POLICY "Only admins can delete banks" ON banks
      FOR DELETE USING (is_admin());
  END IF;
END $$;

-- Payment logs table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_logs') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow public read access to payment_logs" ON payment_logs;
    DROP POLICY IF EXISTS "Allow public insert to payment_logs" ON payment_logs;
    
    -- Create new policies
    CREATE POLICY "Everyone can view payment logs" ON payment_logs
      FOR SELECT USING (true);
    
    CREATE POLICY "Only admins can create payment logs" ON payment_logs
      FOR INSERT WITH CHECK (is_admin());
  END IF;
END $$;

-- Group members table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
    CREATE POLICY "Everyone can view group members" ON group_members
      FOR SELECT USING (true);
    
    CREATE POLICY "Only admins can create group members" ON group_members
      FOR INSERT WITH CHECK (is_admin());
    
    CREATE POLICY "Only admins can update group members" ON group_members
      FOR UPDATE USING (is_admin());
    
    CREATE POLICY "Only admins can delete group members" ON group_members
      FOR DELETE USING (is_admin());
  END IF;
END $$;

-- Step 8: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON auth_users TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant permissions to existing tables (only if they exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
    GRANT ALL ON groups TO anon;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
    GRANT ALL ON members TO anon;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_slots') THEN
    GRANT ALL ON payment_slots TO anon;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    GRANT ALL ON payments TO anon;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banks') THEN
    GRANT ALL ON banks TO anon;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_logs') THEN
    GRANT ALL ON payment_logs TO anon;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') THEN
    GRANT ALL ON group_members TO anon;
  END IF;
END $$;

-- Step 9: Create a view for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
  COUNT(CASE WHEN role = 'super_user' THEN 1 END) as super_user_users,
  COUNT(CASE WHEN role = 'member' THEN 1 END) as member_users,
  COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_30_days
FROM auth_users;

-- Grant access to the view
GRANT SELECT ON user_stats TO anon;
