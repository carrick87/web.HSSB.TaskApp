import { redirect } from "next/navigation";

export default function AdminUserDetailRedirect() {
  redirect("/settings/members");
}
