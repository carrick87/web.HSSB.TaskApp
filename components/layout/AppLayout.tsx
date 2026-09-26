import { requireOrgContext, getUserOrganizations } from "@/lib/org/context";
import { organizationToCompanyProfile } from "@/lib/org/branding";
import { Sidebar } from "./Sidebar";

export async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireOrgContext();
  const organizations = await getUserOrganizations(ctx.profile.id);
  const company = organizationToCompanyProfile(ctx.org);

  return (
    <div className="app-shell">
      <Sidebar
        username={ctx.profile.username}
        orgRole={ctx.membership.role}
        company={company}
        orgId={ctx.org.id !== "legacy" ? ctx.org.id : undefined}
        currentOrgId={ctx.org.id}
        organizations={organizations as unknown as Parameters<typeof Sidebar>[0]["organizations"]}
        isPlatformAdmin={!!ctx.profile.is_platform_admin}
      />

      <main className="main-content">
        <div className="min-h-screen px-4 pt-2 pb-4 lg:px-6 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
