-- supabase/migrations/20260406000000_members_avatar_url.sql

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS avatar_url text;
