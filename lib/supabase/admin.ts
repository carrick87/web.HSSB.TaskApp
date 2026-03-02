import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with service role key (bypasses RLS).
 * Use only for admin actions (e.g. password reset).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin client");
  return createClient(url, key, { auth: { persistSession: false } });
}
