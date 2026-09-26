import { AppLayout } from "@/components/layout/AppLayout";
import { requireRole } from "@/lib/auth";

export default async function PicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["super_admin", "manager"]);
  return (
    <AppLayout>
      <div>{children}</div>
    </AppLayout>
  );
}
