-- Shared signup-wizard setting: show or hide the Slot Information step.
-- One row is used by every device and browser, including the public signup page.
-- Run this in the Supabase SQL Editor after the auth and app_settings migrations.

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can view app settings" ON app_settings;
DROP POLICY IF EXISTS "Anyone can view the signup slot step setting" ON app_settings;
DROP POLICY IF EXISTS "Signed-in users can insert app settings" ON app_settings;
DROP POLICY IF EXISTS "Signed-in users can update app settings" ON app_settings;

CREATE POLICY "Signed-in users can view app settings" ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view the signup slot step setting" ON app_settings
  FOR SELECT
  TO anon
  USING (setting_key = 'signup-show-slot-step');

CREATE POLICY "Signed-in users can insert app settings" ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    setting_key IS DISTINCT FROM 'signup-show-slot-step'
    OR is_super_user()
  );

CREATE POLICY "Signed-in users can update app settings" ON app_settings
  FOR UPDATE
  TO authenticated
  USING (
    setting_key IS DISTINCT FROM 'signup-show-slot-step'
    OR is_super_user()
  )
  WITH CHECK (
    setting_key IS DISTINCT FROM 'signup-show-slot-step'
    OR is_super_user()
  );

GRANT SELECT, INSERT, UPDATE ON app_settings TO authenticated;
GRANT SELECT ON app_settings TO anon;

INSERT INTO app_settings (setting_key, setting_value)
VALUES ('signup-show-slot-step', 'true'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
