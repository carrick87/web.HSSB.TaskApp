import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!login || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const username = login;
    const admin = createAdminClient();
    let profile: { auth_email: string; status?: string; must_change_password?: boolean } | null = null;
    const primary = await admin
      .from("profiles")
      .select("auth_email, status, must_change_password")
      .eq("username", username)
      .maybeSingle();

    if (primary.error && /status/.test(primary.error.message)) {
      const fallback = await admin
        .from("profiles")
        .select("auth_email")
        .eq("username", username)
        .maybeSingle();
      if (fallback.error || !fallback.data?.auth_email) {
        return NextResponse.json(
          { error: "Invalid username or password." },
          { status: 401 }
        );
      }
      profile = fallback.data;
    } else if (primary.error || !primary.data?.auth_email) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    } else {
      profile = primary.data;
    }

    if (profile.status === "deactivated") {
      return NextResponse.json(
        { error: "This account has been deactivated." },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: profile.auth_email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Invalid username or password." },
        { status: 401 }
      );
    }

    await admin
      .from("profiles")
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq("username", username);

    const mustChange = profile.must_change_password === true;

    return NextResponse.json({ user: data.user, mustChangePassword: mustChange });
  } catch {
    return NextResponse.json(
      { error: "An error occurred." },
      { status: 500 }
    );
  }
}
