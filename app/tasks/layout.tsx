import { AppLayout } from "@/components/layout/AppLayout";

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <div className="p-4 lg:p-6 pt-16 lg:pt-6">{children}</div>
    </AppLayout>
  );
}
