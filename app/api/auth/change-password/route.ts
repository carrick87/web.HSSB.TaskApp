import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  const confirm = typeof body.confirm === "string" ? body.confirm : "";
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (password !== confirm) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: pwError } = await admin.auth.admin.updateUserById(user.id, { password });
  if (pwError) {
    return NextResponse.json({ error: pwError.message }, { status: 500 });
  }

  await admin.from("profiles").update({ must_change_password: false }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}
