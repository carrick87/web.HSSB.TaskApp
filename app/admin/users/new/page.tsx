import { redirect } from "next/navigation";

export default function AdminUsersNewRedirect() {
  redirect("/settings/members");
}
