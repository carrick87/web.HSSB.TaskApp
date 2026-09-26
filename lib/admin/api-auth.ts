import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLES, normalizeProfileRole } from "@/lib/roles";
import type { Profile } from "@/types/database.types";

export async function getAuthenticatedProfile(): Promise<
  { profile: Profile; userId: string } | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (profile.status === "deactivated") {
    return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
  }

  const effectiveRole = normalizeProfileRole(profile.role as string);

  if (effectiveRole !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    profile: { ...(profile as Profile), role: effectiveRole as Profile["role"] },
    userId: user.id,
  };
}
