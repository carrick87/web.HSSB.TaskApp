import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PointSettingsForm } from "@/components/admin/PointSettingsForm";

export default async function AdminPointsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("point_settings")
    .select("id, event_type, points, updated_at")
    .order("event_type");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Point settings
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Event point values</CardTitle>
        </CardHeader>
        <CardContent>
          <PointSettingsForm settings={settings ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
