import { requireProfile } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen bg-neutral-100">
      <Sidebar
        username={profile.username}
        role={profile.role}
      />
      
      <main className="lg:pl-60 pt-14 lg:pt-0" style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top, 0px))' }}>
        <div className="min-h-screen px-4 py-4 lg:px-6 lg:py-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
