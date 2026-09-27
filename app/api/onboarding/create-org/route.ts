import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_ROLES } from "@/lib/org/roles";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const shortName = typeof body.short_name === "string" ? body.short_name.trim() : "";

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  let slug = slugify(name);
  const { data: existingSlug } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name,
      short_name: shortName || name.slice(0, 30),
      slug,
      created_by: user.id,
      status: "active",
    })
    .select("*")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? "Could not create organization" }, { status: 500 });
  }

  await admin.from("organization_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: ORG_ROLES.OWNER,
    status: "active",
  });

  await admin.from("profiles").update({ current_org_id: org.id, role: "user" }).eq("id", user.id);

  const { data: ownerProfile } = await admin.from("profiles").select("username").eq("id", user.id).single();
  const { notifyWelcomeWorkspace } = await import("@/lib/notifications/task-events");
  await notifyWelcomeWorkspace({
    orgId: org.id,
    ownerUserId: user.id,
    ownerName: ownerProfile?.username ?? "there",
  });

  return NextResponse.json({ organization: org });
}
