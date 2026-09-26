import { AppLayout } from "@/components/layout/AppLayout";
import { requireRole } from "@/lib/auth";

export default async function PicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin", "pic"]);
  return (
    <AppLayout>
      <div className="p-4 lg:p-6 pt-16 lg:pt-6">{children}</div>
    </AppLayout>
  );
}
