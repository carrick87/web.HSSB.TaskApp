import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with service role key (bypasses RLS).
 * Use only for admin actions (e.g. password reset).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or Vercel. See https://supabase.com/dashboard/project/_/settings/api"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
