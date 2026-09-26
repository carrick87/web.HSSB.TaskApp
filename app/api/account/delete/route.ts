import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_ROLES } from "@/lib/org/roles";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profileBefore } = await admin
    .from("profiles")
    .select("auth_email, harrison_email")
    .eq("id", user.id)
    .single();
  const notifyEmail = profileBefore?.harrison_email ?? profileBefore?.auth_email;

  const transferTo = typeof body.transfer_owner_to === "string" ? body.transfer_owner_to.trim() : "";
  const deleteOrganization = body.delete_organization === true;

  const { data: owned } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("role", ORG_ROLES.OWNER)
    .eq("status", "active");

  for (const row of owned ?? []) {
    const { count } = await admin
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", row.org_id)
      .eq("role", ORG_ROLES.OWNER)
      .eq("status", "active");

    if ((count ?? 0) <= 1) {
      if (transferTo) {
        const { data: targetMember } = await admin
          .from("organization_members")
          .select("user_id")
          .eq("org_id", row.org_id)
          .eq("user_id", transferTo)
          .eq("status", "active")
          .maybeSingle();
        if (!targetMember) {
          return NextResponse.json(
            { error: "Transfer target must be an active member of the organization." },
            { status: 400 }
          );
        }
        await admin
          .from("organization_members")
          .update({ role: ORG_ROLES.OWNER })
          .eq("org_id", row.org_id)
          .eq("user_id", transferTo);
      } else if (deleteOrganization) {
        await admin.from("organizations").delete().eq("id", row.org_id);
      } else {
        return NextResponse.json(
          { error: "You are the sole owner. Transfer ownership or delete the organization." },
          { status: 400 }
        );
      }
    }
  }

  await admin.from("organization_members").delete().eq("user_id", user.id);
  await admin.from("profiles").delete().eq("id", user.id);
  await admin.auth.admin.deleteUser(user.id);

  if (notifyEmail) {
    const { notifyAccountDeletedEmail } = await import("@/lib/email/membership-events");
    await notifyAccountDeletedEmail(notifyEmail);
  }

  return NextResponse.json({ ok: true });
}
