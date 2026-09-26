import { requireProfile } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F8F9' }}>
      <Sidebar
        username={profile.username}
        role={profile.role}
      />
      
      {/* Main content area */}
      {/* Mobile: offset by sticky header (56px + safe-area-top) via .main-content CSS */}
      {/* Desktop (lg:): offset by sidebar width (240px) via .main-content CSS */}
      <main className="main-content">
        <div className="min-h-screen px-4 pt-2 pb-4 lg:px-6 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
