-- Username-only auth: synthetic auth_email per user; harrison_email for recording only (non-unique)
-- Run after 001_initial_schema.sql and 002_storage.sql

-- Add auth_email column (nullable until backfilled)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_email TEXT;

-- Backfill: use harrison_email where present (matches existing auth.users.email), else synthetic
UPDATE profiles
SET auth_email = COALESCE(
  harrison_email,
  gen_random_uuid()::text || '@taskapp.local'
)
WHERE auth_email IS NULL;

-- Enforce uniqueness and NOT NULL
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_auth_email_key;
ALTER TABLE profiles ADD CONSTRAINT profiles_auth_email_key UNIQUE (auth_email);
ALTER TABLE profiles ALTER COLUMN auth_email SET NOT NULL;

-- Drop UNIQUE on harrison_email so multiple users can share the same email (recording only)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_harrison_email_key;
