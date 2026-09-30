-- Shared groups-table column selection.
-- One row is used by every signed-in device and browser.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can view app settings" ON app_settings;
DROP POLICY IF EXISTS "Signed-in users can insert app settings" ON app_settings;
DROP POLICY IF EXISTS "Signed-in users can update app settings" ON app_settings;

CREATE POLICY "Signed-in users can view app settings" ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Signed-in users can insert app settings" ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Signed-in users can update app settings" ON app_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON app_settings TO authenticated;
