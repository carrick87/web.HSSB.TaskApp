"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { switchCurrentOrg } from "@/lib/org/workspace-access";
import { redirect } from "next/navigation";

export async function switchWorkspaceAction(orgId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const result = await switchCurrentOrg(supabase, user.id, orgId);
  if (!result.ok) {
    redirect("/workspace-suspended");
  }
  redirect("/dashboard");
}
