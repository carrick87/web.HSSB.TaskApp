import { AppLayout } from "@/components/layout/AppLayout";
import { requireOrgManagerOrAbove } from "@/lib/auth";

export default async function PicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOrgManagerOrAbove();
  return (
    <AppLayout>
      <div>{children}</div>
    </AppLayout>
  );
}
