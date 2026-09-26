import { requireProfile } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { redirect } from "next/navigation";

export async function requireSuperAdmin() {
  const profile = await requireProfile();
  if (profile.status === "deactivated") {
    redirect("/login?error=deactivated");
  }
  if (profile.role !== ROLES.SUPER_ADMIN) {
    redirect("/dashboard");
  }
  return profile;
}
