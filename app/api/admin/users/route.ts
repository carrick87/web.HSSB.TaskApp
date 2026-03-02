import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_SUFFIX = "@harrisons.com.my";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { username, email, password, role, branch_id, department_id } = body;
  const fullEmail = typeof email === "string" && email.trim()
    ? (email.trim().toLowerCase().endsWith(EMAIL_SUFFIX)
        ? email.trim().toLowerCase()
        : email.trim().toLowerCase().replace(/@.*$/, "") + EMAIL_SUFFIX)
    : "";

  if (!username?.trim() || username.trim().length < 3) {
    return NextResponse.json({ error: "Username required (min 3 chars)" }, { status: 400 });
  }
  if (fullEmail && !fullEmail.endsWith(EMAIL_SUFFIX)) {
    return NextResponse.json({ error: "Email must end with " + EMAIL_SUFFIX }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password required (min 6 chars)" }, { status: 400 });
  }
  if (!["admin", "pic", "staff"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const auth_email = `${crypto.randomUUID()}@taskapp.local`;
  const admin = createAdminClient();
  const { data: authUser, error: signUpError } = await admin.auth.admin.createUser({
    email: auth_email,
    password,
    email_confirm: true,
  });

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }
  if (!authUser.user) {
    return NextResponse.json({ error: "User not created" }, { status: 500 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    username: username.trim(),
    auth_email,
    harrison_email: fullEmail || null,
    role,
    branch_id: branch_id || null,
    department_id: department_id || null,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ id: authUser.user.id });
}
