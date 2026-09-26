import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPublicCompanyProfile } from "@/lib/company/profile";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const company = await getPublicCompanyProfile();

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
      <LoginForm company={company} />
    </main>
  );
}
