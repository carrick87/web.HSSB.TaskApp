import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Logged-in user only (does not require active membership in current org). */
export async function getAuthenticatedUserId(): Promise<
  { userId: string } | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return { userId: user.id };
}
