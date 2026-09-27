import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { isPlatformAdmin } from "@/lib/platform-admin";

async function requirePlatformApi() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPlatformAdmin(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: user.id };
}

export async function PATCH(request: Request) {
  const auth = await requirePlatformApi();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const orgId = body.org_id;
  const status = body.status === "suspended" ? "suspended" : body.status === "active" ? "active" : null;
  if (!orgId || !status) {
    return NextResponse.json({ error: "org_id and status required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: orgBefore } = await admin.from("organizations").select("status").eq("id", orgId).single();
  const { error } = await admin.from("organizations").update({ status }).eq("id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (orgBefore?.status !== status) {
    const { notifyWorkspaceStatusChange } = await import("@/lib/email/membership-events");
    await notifyWorkspaceStatusChange({
      orgId,
      suspended: status === "suspended",
    });
  }

  return NextResponse.json({ ok: true });
}
