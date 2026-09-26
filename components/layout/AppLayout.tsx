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
      {/* Mobile: offset by sticky header (56px + safe-area-top) */}
      {/* Desktop (lg:): offset by sidebar width (240px = pl-60), no header offset */}
      <main className="main-content lg:pl-60 lg:pt-0">
        <div className="min-h-screen px-4 pt-2 pb-4 lg:px-6 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
