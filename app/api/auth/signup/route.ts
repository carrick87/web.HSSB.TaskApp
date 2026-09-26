import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_ROLES } from "@/lib/org/roles";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || username.length < 2) {
      return NextResponse.json(
        { error: "Username is required (at least 2 characters)." },
        { status: 400 }
      );
    }
    if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password is required (at least 6 characters)." },
        { status: 400 }
      );
    }

    const auth_email = `${crypto.randomUUID()}@taskapp.local`;
    const admin = createAdminClient();

    const { data: authUser, error: createError } = await admin.auth.admin.createUser({
      email: auth_email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json(
        { error: createError.message ?? "Could not create account." },
        { status: 400 }
      );
    }

    if (!authUser.user) {
      return NextResponse.json({ error: "Account could not be created." }, { status: 500 });
    }

    let needsOnboarding = true;
    let currentOrgId: string | null = null;

    if (emailRaw) {
      try {
        const { data: invite } = await admin
          .from("organization_invites")
          .select("org_id, role, invited_by")
          .eq("email", emailRaw)
          .eq("status", "pending")
          .maybeSingle();
        if (invite) {
          needsOnboarding = false;
          currentOrgId = invite.org_id;
          await admin.from("organization_members").insert({
            org_id: invite.org_id,
            user_id: authUser.user.id,
            role: invite.role ?? ORG_ROLES.MEMBER,
            status: "active",
          });
          await admin.from("organization_invites").update({ status: "accepted" }).eq("email", emailRaw);
          if (invite.invited_by) {
            const { notifyInviteAccepted } = await import("@/lib/email/membership-events");
            await notifyInviteAccepted({
              orgId: invite.org_id,
              inviterUserId: invite.invited_by,
              inviteeUserId: authUser.user.id,
            });
          }
        }
      } catch {
        /* invites table not migrated yet */
      }
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      username,
      auth_email,
      harrison_email: emailRaw || null,
      role: "user",
      branch_id: null,
      department_id: null,
      current_org_id: currentOrgId,
    });

    if (profileError) {
      if (profileError.code === "23505") {
        return NextResponse.json({ error: "This username is already taken." }, { status: 400 });
      }
      return NextResponse.json({ error: profileError.message ?? "Could not create profile." }, { status: 500 });
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: auth_email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Account created. Please sign in with your username and password." },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, needsOnboarding });
  } catch {
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 });
  }
}
