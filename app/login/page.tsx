import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { productBrandAsCompanyProfile } from "@/lib/org/branding";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const company = productBrandAsCompanyProfile();

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
      <LoginForm company={company} />
    </main>
  );
}
