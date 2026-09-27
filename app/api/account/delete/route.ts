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
    return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profileBefore } = await admin
    .from("profiles")
    .select("auth_email, harrison_email")
    .eq("id", user.id)
    .single();
  const notifyEmail = profileBefore?.auth_email ?? profileBefore?.harrison_email ?? null;

  const transferTo = typeof body.transfer_owner_to === "string" ? body.transfer_owner_to.trim() : "";
  const deleteOrganization = body.delete_organization === true;

  const { data: owned, error: ownedError } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("role", ORG_ROLES.OWNER)
    .eq("status", "active");

  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 500 });
  }

  for (const row of owned ?? []) {
    const { count, error: countError } = await admin
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", row.org_id)
      .eq("role", ORG_ROLES.OWNER)
      .eq("status", "active");

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) <= 1) {
      if (transferTo) {
        const { data: targetMember, error: targetError } = await admin
          .from("organization_members")
          .select("user_id")
          .eq("org_id", row.org_id)
          .eq("user_id", transferTo)
          .eq("status", "active")
          .maybeSingle();
        if (targetError) {
          return NextResponse.json({ error: targetError.message }, { status: 500 });
        }
        if (!targetMember) {
          return NextResponse.json(
            { error: "Transfer target must be an active member of the organization." },
            { status: 400 }
          );
        }
        const { error: promoteError } = await admin
          .from("organization_members")
          .update({ role: ORG_ROLES.OWNER })
          .eq("org_id", row.org_id)
          .eq("user_id", transferTo);
        if (promoteError) {
          return NextResponse.json({ error: promoteError.message }, { status: 500 });
        }
      } else if (deleteOrganization) {
        const { error: orgDeleteError } = await admin.from("organizations").delete().eq("id", row.org_id);
        if (orgDeleteError) {
          return NextResponse.json({ error: orgDeleteError.message }, { status: 500 });
        }
      } else {
        return NextResponse.json(
          {
            error:
              "You are the sole owner. Transfer ownership to another member or delete the workspace before deleting your account.",
          },
          { status: 400 }
        );
      }
    }
  }

  const { error: memberDeleteError } = await admin.from("organization_members").delete().eq("user_id", user.id);
  if (memberDeleteError) {
    return NextResponse.json({ error: memberDeleteError.message }, { status: 500 });
  }

  const { error: profileDeleteError } = await admin.from("profiles").delete().eq("id", user.id);
  if (profileDeleteError) {
    return NextResponse.json({ error: profileDeleteError.message }, { status: 500 });
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);
  if (authDeleteError) {
    return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
  }

  if (notifyEmail) {
    try {
      const { notifyAccountDeletedEmail } = await import("@/lib/email/membership-events");
      await notifyAccountDeletedEmail(notifyEmail);
    } catch (e) {
      console.error("Account deleted email failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}
