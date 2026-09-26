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
      
      <main className="lg:pl-60">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
