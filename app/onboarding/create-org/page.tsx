import { redirect } from "next/navigation";

export default function CreateOrgLegacyRedirect() {
  redirect("/onboarding/workspace");
}
