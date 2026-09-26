import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database.types";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { isPlatformAdmin } from "@/lib/platform-admin";

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

  const orgCtx = await getOrgApiContext(true);
  if (orgCtx instanceof NextResponse) {
    if (await isPlatformAdmin(supabase)) {
      return { profile: profile as Profile, userId: user.id };
    }
    return orgCtx;
  }

  return { profile: profile as Profile, userId: user.id };
}
