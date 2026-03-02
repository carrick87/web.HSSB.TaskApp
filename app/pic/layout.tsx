import { AppHeader } from "@/components/layout/AppHeader";
import { requireRole } from "@/lib/auth";

export default async function PicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin", "pic"]);
  return (
    <>
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </>
  );
}
