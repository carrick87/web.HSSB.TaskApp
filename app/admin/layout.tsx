import { AppLayout } from "@/components/layout/AppLayout";
import { requireRole } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin"]);
  return (
    <AppLayout>
      <div>
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="shrink-0 lg:w-52">
            <AdminNav />
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </AppLayout>
  );
}
