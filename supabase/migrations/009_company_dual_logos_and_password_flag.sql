-- 009: Dual company logos (wide + square), short_name max 30, must_change_password on profiles.

ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS logo_wide_path TEXT,
  ADD COLUMN IF NOT EXISTS logo_square_path TEXT;

UPDATE public.company_profile
SET logo_wide_path = logo_path
WHERE logo_path IS NOT NULL AND logo_wide_path IS NULL;

ALTER TABLE public.company_profile DROP COLUMN IF EXISTS logo_path;

ALTER TABLE public.company_profile DROP CONSTRAINT IF EXISTS company_profile_short_name_check;
ALTER TABLE public.company_profile ADD CONSTRAINT company_profile_short_name_check
  CHECK (short_name IS NULL OR char_length(short_name) <= 30);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
