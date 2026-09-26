import { AppLayout } from "@/components/layout/AppLayout";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <div>{children}</div>
    </AppLayout>
  );
}
