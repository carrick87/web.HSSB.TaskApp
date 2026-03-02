import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const { username, harrison_email, role, branch_id, department_id } = body;
  if (!username?.trim() || username.trim().length < 3) {
    return NextResponse.json({ error: "Username required (min 3 chars)" }, { status: 400 });
  }
  if (!["admin", "pic", "staff"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const emailVal = typeof harrison_email === "string" ? harrison_email.trim().toLowerCase() || null : null;
  if (emailVal !== null && !emailVal.endsWith("@harrisons.com.my")) {
    return NextResponse.json({ error: "Email must end with @harrisons.com.my" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: username.trim(),
      harrison_email: emailVal,
      role,
      branch_id: branch_id || null,
      department_id: department_id || null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
