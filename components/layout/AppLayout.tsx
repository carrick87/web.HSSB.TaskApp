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
      
      <main 
        className="lg:pl-60"
        style={{ 
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'
        }}
      >
        <div className="min-h-screen px-4 py-4 lg:px-6 lg:py-6 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
