import { AppLayout } from "@/components/layout/AppLayout";

export default function LeaderboardLayout({
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
