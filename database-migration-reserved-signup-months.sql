-- Let the public sign-up wizard see which months are held by pending sign-ups,
-- without exposing the sign-up's personal details.
-- Rejecting or approving a sign-up deletes its row, which releases this reservation.
-- Run this in the Supabase SQL Editor.

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_signups_group_desired_month
  ON member_signups (group_id, desired_month)
  WHERE group_id IS NOT NULL AND desired_month IS NOT NULL;

DROP VIEW IF EXISTS reserved_signup_months;

CREATE VIEW reserved_signup_months
WITH (security_invoker = false) AS
SELECT group_id, desired_month
FROM member_signups
WHERE group_id IS NOT NULL
  AND desired_month IS NOT NULL;

REVOKE ALL ON reserved_signup_months FROM PUBLIC, anon, authenticated;
GRANT SELECT ON reserved_signup_months TO anon, authenticated;
