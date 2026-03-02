import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const HARISON_EMAIL_SUFFIX = "@harrisons.com.my";

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
    if (emailRaw && !emailRaw.endsWith(HARISON_EMAIL_SUFFIX)) {
      return NextResponse.json(
        { error: `Email must be a Harrison email (ending in ${HARISON_EMAIL_SUFFIX}).` },
        { status: 400 }
      );
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
      if (createError.message?.toLowerCase().includes("already registered")) {
        return NextResponse.json(
          { error: "This username may already exist. Try signing in or choose another username." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: createError.message ?? "Could not create account." },
        { status: 400 }
      );
    }

    if (!authUser.user) {
      return NextResponse.json(
        { error: "Account could not be created." },
        { status: 500 }
      );
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      username,
      auth_email,
      harrison_email: emailRaw || null,
      role: "staff",
      branch_id: null,
      department_id: null,
    });

    if (profileError) {
      if (profileError.code === "23505") {
        return NextResponse.json(
          { error: "This username is already taken." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: profileError.message ?? "Could not create profile." },
        { status: 500 }
      );
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
