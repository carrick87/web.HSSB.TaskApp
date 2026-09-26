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
    const inviteToken =
      typeof body.inviteToken === "string"
        ? body.inviteToken.trim()
        : typeof body.invite === "string"
          ? body.invite.trim()
          : "";

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

    const admin = createAdminClient();

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existingProfile) {
      return NextResponse.json({ error: "This username is already taken." }, { status: 400 });
    }

    let invite: {
      id: string;
      org_id: string;
      role: string;
      invited_by: string | null;
      email: string;
      status: string;
      expires_at: string | null;
    } | null = null;

    if (inviteToken) {
      const { data: inviteRow, error: inviteError } = await admin
        .from("organization_invites")
        .select("id, org_id, role, invited_by, email, status, expires_at")
        .eq("token", inviteToken)
        .maybeSingle();

      if (inviteError || !inviteRow || inviteRow.status !== "pending") {
        return NextResponse.json({ error: "Invalid or expired invitation." }, { status: 400 });
      }
      if (inviteRow.expires_at && new Date(inviteRow.expires_at) < new Date()) {
        return NextResponse.json({ error: "Invitation has expired." }, { status: 400 });
      }
      if (emailRaw && inviteRow.email.toLowerCase() !== emailRaw) {
        return NextResponse.json({ error: "Email does not match this invitation." }, { status: 400 });
      }
      invite = inviteRow;
    }

    const auth_email = invite?.email ?? (emailRaw || `${crypto.randomUUID()}@taskapp.local`);

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
    const currentOrgId = invite?.org_id ?? null;
    if (invite) {
      needsOnboarding = false;
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      username,
      auth_email,
      harrison_email: null,
      role: "staff",
      branch_id: null,
      department_id: null,
      current_org_id: currentOrgId,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      if (profileError.code === "23505") {
        return NextResponse.json({ error: "This username is already taken." }, { status: 400 });
      }
      return NextResponse.json({ error: profileError.message ?? "Could not create profile." }, { status: 500 });
    }

    if (invite) {
      const { error: memberError } = await admin.from("organization_members").insert({
        org_id: invite.org_id,
        user_id: authUser.user.id,
        role: invite.role ?? ORG_ROLES.MEMBER,
        status: "active",
      });
      if (memberError) {
        await admin.from("profiles").delete().eq("id", authUser.user.id);
        await admin.auth.admin.deleteUser(authUser.user.id);
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }

      const { data: consumed, error: usedError } = await admin
        .from("organization_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id)
        .eq("status", "pending")
        .select("id");
      if (usedError) {
        await admin.from("organization_members").delete().eq("user_id", authUser.user.id).eq("org_id", invite.org_id);
        await admin.from("profiles").delete().eq("id", authUser.user.id);
        await admin.auth.admin.deleteUser(authUser.user.id);
        return NextResponse.json({ error: usedError.message }, { status: 500 });
      }
      if (!consumed?.length) {
        await admin.from("organization_members").delete().eq("user_id", authUser.user.id).eq("org_id", invite.org_id);
        await admin.from("profiles").delete().eq("id", authUser.user.id);
        await admin.auth.admin.deleteUser(authUser.user.id);
        return NextResponse.json({ error: "Invitation was already used." }, { status: 409 });
      }

      if (invite.invited_by) {
        const { notifyInviteAccepted } = await import("@/lib/email/membership-events");
        await notifyInviteAccepted({
          orgId: invite.org_id,
          inviterUserId: invite.invited_by,
          inviteeUserId: authUser.user.id,
        });
      }
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
