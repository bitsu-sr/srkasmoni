-- Migration: Add cash_inventory table for Financial Management page
-- This table stores the physical cash on hand by banknote denomination

-- Create cash_inventory table
CREATE TABLE IF NOT EXISTS cash_inventory (
  id SERIAL PRIMARY KEY,
  denomination INTEGER NOT NULL UNIQUE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint to ensure only valid SRD denominations
ALTER TABLE cash_inventory 
ADD CONSTRAINT valid_denomination 
CHECK (denomination IN (5, 10, 20, 50, 100, 200, 500));

-- Add check constraint to ensure non-negative quantities
ALTER TABLE cash_inventory 
ADD CONSTRAINT non_negative_quantity 
CHECK (quantity >= 0);

-- Create index on denomination for faster lookups
CREATE INDEX idx_cash_inventory_denomination ON cash_inventory(denomination);

-- Insert default rows for all SRD denominations (initialized to 0)
INSERT INTO cash_inventory (denomination, quantity) VALUES
  (5, 0),
  (10, 0),
  (20, 0),
  (50, 0),
  (100, 0),
  (200, 0),
  (500, 0)
ON CONFLICT (denomination) DO NOTHING;

-- Add RLS (Row Level Security) policies
ALTER TABLE cash_inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins to view cash inventory
CREATE POLICY "Admins can view cash inventory"
  ON cash_inventory
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- Policy: Allow admins to update cash inventory
CREATE POLICY "Admins can update cash inventory"
  ON cash_inventory
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth_users 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- Policy: Allow admins to insert cash inventory records
CREATE POLICY "Admins can insert cash inventory"
  ON cash_inventory
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_users 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cash_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on update
CREATE TRIGGER cash_inventory_updated_at
  BEFORE UPDATE ON cash_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_cash_inventory_updated_at();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON cash_inventory TO authenticated;
GRANT USAGE ON SEQUENCE cash_inventory_id_seq TO authenticated;

COMMENT ON TABLE cash_inventory IS 'Stores physical cash on hand by SRD banknote denomination';
COMMENT ON COLUMN cash_inventory.denomination IS 'SRD banknote denomination (5, 10, 20, 50, 100, 200, 500)';
COMMENT ON COLUMN cash_inventory.quantity IS 'Number of banknotes of this denomination currently on hand';

