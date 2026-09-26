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
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-1000">
          Leaderboard
        </h1>
        <p className="text-sm text-neutral-700 mt-0.5">
          Top performers by points earned
        </p>
      </div>
      <LeaderboardClient
        initialData={initialData}
        branches={branches ?? []}
        departments={departments ?? []}
      />
    </div>
  );
}
