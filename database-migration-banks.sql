-- Database Migration: Add Banks Table
-- Run this in your Supabase SQL Editor

-- Create banks table
CREATE TABLE IF NOT EXISTS banks (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  short_name VARCHAR(50) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_banks_name ON banks(name);
CREATE INDEX idx_banks_short_name ON banks(short_name);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_banks_updated_at 
  BEFORE UPDATE ON banks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to banks" ON banks
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to banks" ON banks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to banks" ON banks
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete from banks" ON banks
  FOR DELETE USING (true);

-- Insert some sample banks for Suriname
INSERT INTO banks (name, short_name, address) VALUES
  ('Surinaamse Bank', 'DSB', 'Waterkant 1, Paramaribo, Suriname'),
  ('Finabank', 'Finabank', 'Dr. Sophie Redmondstraat 123, Paramaribo, Suriname'),
  ('Hakrinbank', 'Hakrinbank', 'Maagdenstraat 45, Paramaribo, Suriname'),
  ('Suriname Volkscredietbank', 'SVCB', 'Keizerstraat 67, Paramaribo, Suriname')
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON banks TO anon;
GRANT USAGE, SELECT ON SEQUENCE banks_id_seq TO anon;
