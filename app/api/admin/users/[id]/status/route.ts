import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/admin/api-auth";
import { writeAuditLog } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES } from "@/lib/roles";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAuthenticatedProfile();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (status !== "active" && status !== "deactivated") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (
    id === auth.userId &&
    before.role === ROLES.SUPER_ADMIN &&
    status === "deactivated"
  ) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", ROLES.SUPER_ADMIN)
      .eq("status", "active")
      .neq("id", id);
    if ((count ?? 0) === 0) {
      return NextResponse.json(
        { error: "You cannot deactivate yourself while you are the last active super admin." },
        { status: 400 }
      );
    }
  }

  const { data: after, error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  if (status === "deactivated") {
    await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
  } else {
    await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
  }

  await writeAuditLog({
    actorId: auth.userId,
    targetId: id,
    action: status === "active" ? "user.reactivate" : "user.deactivate",
    before: before as Record<string, unknown>,
    after: after as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, user: after });
}
