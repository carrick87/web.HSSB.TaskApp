import { AppHeader } from "@/components/layout/AppHeader";

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </>
  );
}
