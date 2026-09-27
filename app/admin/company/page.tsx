import { redirect } from "next/navigation";

export default function AdminCompanyRedirect() {
  redirect("/settings/organization");
}
