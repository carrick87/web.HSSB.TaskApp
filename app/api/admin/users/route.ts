import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/admin/api-auth";
import { writeAuditLog, isValidAppRole } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES } from "@/lib/roles";

const EMAIL_SUFFIX = "@harrisons.com.my";

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

export async function POST(request: Request) {
  const auth = await getAuthenticatedProfile();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const {
    username,
    email,
    password,
    role,
    branch_id,
    department_id,
    create_method: createMethodRaw,
  } = body;

  const create_method =
    createMethodRaw === "temp_password" ? "temp_password" : "invite";

  const fullEmail =
    typeof email === "string" && email.trim()
      ? email.trim().toLowerCase().endsWith(EMAIL_SUFFIX)
        ? email.trim().toLowerCase()
        : email.trim().toLowerCase().replace(/@.*$/, "") + EMAIL_SUFFIX
      : "";

  if (!username?.trim() || username.trim().length < 3) {
    return NextResponse.json({ error: "Username required (min 3 chars)" }, { status: 400 });
  }
  if (!isValidAppRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (create_method === "invite") {
    if (!fullEmail) {
      return NextResponse.json(
        { error: "A Harrison email is required to send an invite." },
        { status: 400 }
      );
    }
  } else {
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Temporary password required (min 6 chars)" }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  let authUserId: string;
  let auth_email: string;

  if (create_method === "invite") {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      fullEmail,
      { data: { username: username.trim() } }
    );
    if (inviteError || !invited.user) {
      return NextResponse.json(
        { error: inviteError?.message ?? "Invite failed. Check Supabase email rate limits." },
        { status: 400 }
      );
    }
    authUserId = invited.user.id;
    auth_email = fullEmail;
  } else {
    auth_email = `${crypto.randomUUID()}@taskapp.local`;
    const { data: authUser, error: signUpError } = await admin.auth.admin.createUser({
      email: auth_email,
      password,
      email_confirm: true,
    });
    if (signUpError || !authUser.user) {
      return NextResponse.json({ error: signUpError?.message ?? "User not created" }, { status: 400 });
    }
    authUserId = authUser.user.id;
  }

  const { data: created, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: authUserId,
      username: username.trim(),
      auth_email,
      harrison_email: fullEmail || null,
      role,
      status: "active",
      branch_id: branch_id || null,
      department_id: department_id || null,
      must_change_password: create_method === "temp_password",
    })
    .select("*")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await writeAuditLog({
    actorId: auth.userId,
    targetId: authUserId,
    action: create_method === "invite" ? "user.invite" : "user.create_temp_password",
    after: created as Record<string, unknown>,
  });

  return NextResponse.json({ id: authUserId });
}
