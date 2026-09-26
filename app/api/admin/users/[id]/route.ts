import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/admin/api-auth";
import { writeAuditLog, isValidAppRole } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES } from "@/lib/roles";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAuthenticatedProfile();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const { username, harrison_email, role, branch_id, department_id } = body;
  if (!username?.trim() || username.trim().length < 3) {
    return NextResponse.json({ error: "Username required (min 3 chars)" }, { status: 400 });
  }
  if (!isValidAppRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const emailVal =
    typeof harrison_email === "string" ? harrison_email.trim().toLowerCase() || null : null;
  if (emailVal !== null && !emailVal.endsWith("@harrisons.com.my")) {
    return NextResponse.json({ error: "Email must end with @harrisons.com.my" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("*").eq("id", id).single();

  if (!before) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (
    id === auth.userId &&
    before.role === ROLES.SUPER_ADMIN &&
    role !== ROLES.SUPER_ADMIN
  ) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", ROLES.SUPER_ADMIN)
      .eq("status", "active")
      .neq("id", id);
    if ((count ?? 0) === 0) {
      return NextResponse.json(
        { error: "You cannot demote yourself while you are the last active super admin." },
        { status: 400 }
      );
    }
  }

  const { data: after, error } = await supabase
    .from("profiles")
    .update({
      username: username.trim(),
      harrison_email: emailVal,
      role,
      branch_id: branch_id || null,
      department_id: department_id || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: auth.userId,
    targetId: id,
    action: "user.update",
    before: before as Record<string, unknown>,
    after: after as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, user: after });
}
