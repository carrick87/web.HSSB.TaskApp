import { AppHeader } from "@/components/layout/AppHeader";
import { requireRole } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin"]);
  return (
    <>
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-8">
        <aside className="shrink-0">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
