import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/admin/api-auth";

export async function GET() {
  const auth = await getAuthenticatedProfile();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, harrison_email, auth_email, role, status, last_sign_in_at, branch_id, department_id, branch:branches(name), department:departments(name)"
    )
    .order("username");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Creating users here is retired. Invite members from organization settings (/settings/members).",
    },
    { status: 410 }
  );
}
