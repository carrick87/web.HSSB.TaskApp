"use client";

import { createBrowserClient } from "@supabase/ssr";

const MISSING_ENV = `
Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local or Vercel. See https://supabase.com/dashboard/project/_/settings/api
`;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(MISSING_ENV.trim());
  }
  return createBrowserClient(url, anonKey);
}
