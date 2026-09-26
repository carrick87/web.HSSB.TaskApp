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
      
      <main 
        className="lg:pl-60"
        style={{ 
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div className="min-h-screen px-4 py-4 lg:px-6 lg:py-6 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
