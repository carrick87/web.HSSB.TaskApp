"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type Prefs = {
  task_activity: boolean;
  reminders: boolean;
  digest_frequency: "off" | "daily" | "weekly";
  membership_updates: boolean;
};

const TIMEZONES = [
  "Asia/Kuching",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
];

export function NotificationSettingsForm() {
  const [timezone, setTimezone] = useState("Asia/Kuching");
  const [prefs, setPrefs] = useState<Prefs>({
    task_activity: true,
    reminders: true,
    digest_frequency: "off",
    membership_updates: true,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.timezone) setTimezone(data.timezone);
        if (data.preferences) {
          setPrefs((p) => ({ ...p, ...data.preferences }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone, ...prefs }),
    });
    setSaving(false);
    setMessage(res.ok ? "Saved." : "Could not save settings.");
  }

  if (loading) {
    return <p className="text-sm text-neutral-700">Loading…</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-1000">Notification settings</h1>
        <p className="text-sm text-neutral-700 mt-1">
          Control email notifications for this workspace. Invites and security emails always send.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="atlassian-label" htmlFor="tz">
            Used for due-date reminders at 8:00 AM local time
          </label>
          <select id="tz" className="atlassian-select mt-2 min-h-[44px]" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Task activity"
            description="Assignments, comments, mentions, status and due date changes"
            checked={prefs.task_activity}
            onChange={(v) => setPrefs({ ...prefs, task_activity: v })}
          />
          <ToggleRow
            label="Due date reminders"
            description="One daily email listing tasks due today, tomorrow, and overdue"
            checked={prefs.reminders}
            onChange={(v) => setPrefs({ ...prefs, reminders: v })}
          />
          <ToggleRow
            label="Membership updates"
            description="Role changes and when someone accepts your invite"
            checked={prefs.membership_updates}
            onChange={(v) => setPrefs({ ...prefs, membership_updates: v })}
          />
          <div>
            <p className="text-sm font-medium text-neutral-1000">Task digest</p>
            <p className="text-xs text-neutral-700 mb-2">Summary of open tasks and recent activity</p>
            <select
              className="atlassian-select min-h-[44px]"
              value={prefs.digest_frequency}
              onChange={(e) => setPrefs({ ...prefs, digest_frequency: e.target.value as Prefs["digest_frequency"] })}
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Mondays)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {message && <p className="text-sm text-brand-700">{message}</p>}

      <Button onClick={save} disabled={saving} className="min-h-[44px]">
        {saving ? "Saving…" : "Save preferences"}
      </Button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
      <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-neutral-1000">{label}</span>
        <span className="block text-xs text-neutral-700">{description}</span>
      </span>
    </label>
  );
}
