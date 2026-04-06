-- supabase/migrations/20260406000001_members_email.sql

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email text;
