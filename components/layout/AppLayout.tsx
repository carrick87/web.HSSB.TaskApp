import { requireProfile } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { getPublicCompanyProfile } from "@/lib/company/profile";

export async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const company = await getPublicCompanyProfile();

  return (
    <div className="app-shell">
      <Sidebar
        username={profile.username}
        role={profile.role}
        company={company}
      />
      
      {/* Main content area */}
      {/* Mobile: single column, content below sticky header */}
      {/* Desktop (lg:): second column of the grid, sidebar in first column */}
      <main className="main-content">
        <div className="min-h-screen px-4 pt-2 pb-4 lg:px-6 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
