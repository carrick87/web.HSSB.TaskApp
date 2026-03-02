import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getLeaderboard } from "@/lib/leaderboard";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";

export default async function LeaderboardPage() {
  await requireProfile();
  const supabase = await createClient();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { data: branches } = await supabase.from("branches").select("id, name").order("name");
  const { data: departments } = await supabase.from("departments").select("id, name, branch_id").order("name");

  const initialData = await getLeaderboard({ period: "month", month, year });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Leaderboard
      </h1>
      <LeaderboardClient
        initialData={initialData}
        branches={branches ?? []}
        departments={departments ?? []}
      />
    </div>
  );
}
