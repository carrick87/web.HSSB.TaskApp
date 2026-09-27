"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type MatrixPrefs = {
  pause_all: boolean;
  timezone: string;
  date_format: string;
  digest_frequency: "off" | "daily" | "weekly";
  email_invites: boolean;
  email_task_activity: boolean;
  email_reminders: boolean;
  email_security: boolean;
  in_app_invites: boolean;
  in_app_task_activity: boolean;
  in_app_reminders: boolean;
  in_app_security: boolean;
};

const DEFAULT_MATRIX: MatrixPrefs = {
  pause_all: false,
  timezone: "Asia/Kuching",
  date_format: "DD/MM/YYYY",
  digest_frequency: "off",
  email_invites: true,
  email_task_activity: true,
  email_reminders: true,
  email_security: true,
  in_app_invites: true,
  in_app_task_activity: true,
  in_app_reminders: true,
  in_app_security: true,
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

type RowKey = "invites" | "task_activity" | "reminders" | "security";

const ROWS: { key: RowKey; label: string; description: string; locked?: boolean }[] = [
  { key: "invites", label: "Invites", description: "Workspace invitations", locked: true },
  { key: "task_activity", label: "Task activity", description: "Assignments, comments, status" },
  { key: "reminders", label: "Reminders", description: "Due today / overdue digest at 8:00 AM" },
  { key: "security", label: "Security", description: "Account and workspace status", locked: true },
];

export function NotificationSettingsForm({ preview = false }: { preview?: boolean }) {
  const [prefs, setPrefs] = useState<MatrixPrefs>(DEFAULT_MATRIX);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(!preview);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preview) return;
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.timezone) setPrefs((p) => ({ ...p, timezone: data.timezone }));
        if (data.date_format) setPrefs((p) => ({ ...p, date_format: data.date_format }));
        if (data.preferences) setPrefs((p) => ({ ...p, ...data.preferences }));
      })
      .finally(() => setLoading(false));
  }, [preview]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    setMessage(res.ok ? "Saved." : "Could not save settings.");
  }

  function setEmailRow(key: RowKey, value: boolean) {
    const map: Record<RowKey, keyof MatrixPrefs> = {
      invites: "email_invites",
      task_activity: "email_task_activity",
      reminders: "email_reminders",
      security: "email_security",
    };
    setPrefs({ ...prefs, [map[key]]: value });
  }

  function setInAppRow(key: RowKey, value: boolean) {
    const map: Record<RowKey, keyof MatrixPrefs> = {
      invites: "in_app_invites",
      task_activity: "in_app_task_activity",
      reminders: "in_app_reminders",
      security: "in_app_security",
    };
    setPrefs({ ...prefs, [map[key]]: value });
  }

  function emailChecked(key: RowKey) {
    const map: Record<RowKey, keyof MatrixPrefs> = {
      invites: "email_invites",
      task_activity: "email_task_activity",
      reminders: "email_reminders",
      security: "email_security",
    };
    return prefs[map[key]] as boolean;
  }

  function inAppChecked(key: RowKey) {
    const map: Record<RowKey, keyof MatrixPrefs> = {
      invites: "in_app_invites",
      task_activity: "in_app_task_activity",
      reminders: "in_app_reminders",
      security: "in_app_security",
    };
    return prefs[map[key]] as boolean;
  }

  if (loading) {
    return <p className="text-sm text-neutral-700">Loading…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="notification-settings-grid">
      <div>
        <h1 className="text-2xl font-bold text-neutral-1000">Notification settings</h1>
        <p className="text-sm text-neutral-700 mt-1">Per workspace — invites and security always deliver.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.pause_all}
              onChange={(e) => setPrefs({ ...prefs, pause_all: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-semibold text-neutral-1000">Pause all emails</span>
              <span className="block text-xs text-neutral-700">In-app notifications still follow the grid below.</span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[520px]">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 pr-4 font-semibold text-neutral-800">Event</th>
                <th className="text-center py-2 px-2 font-semibold text-neutral-800 w-24">Email</th>
                <th className="text-center py-2 px-2 font-semibold text-neutral-800 w-24">In-app</th>
                <th className="text-center py-2 px-2 font-semibold text-neutral-800 w-28">Push</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 align-top">
                    <span className="font-medium text-neutral-1000">{row.label}</span>
                    <span className="block text-xs text-neutral-700">{row.description}</span>
                    {row.locked ? (
                      <span className="text-xs text-neutral-600">Always on for email</span>
                    ) : null}
                  </td>
                  <td className="text-center py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={row.locked ? true : emailChecked(row.key)}
                      disabled={row.locked || prefs.pause_all}
                      onChange={(e) => setEmailRow(row.key, e.target.checked)}
                      aria-label={`${row.label} email`}
                    />
                  </td>
                  <td className="text-center py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={inAppChecked(row.key)}
                      disabled={row.locked && row.key === "invites"}
                      onChange={(e) => setInAppRow(row.key, e.target.checked)}
                      aria-label={`${row.label} in-app`}
                    />
                  </td>
                  <td className="text-center py-3 align-middle">
                    <span className="text-xs text-neutral-600" title="Coming with the mobile app">
                      —
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-neutral-600 mt-3">Push: coming with the mobile app.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule &amp; format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="atlassian-label" htmlFor="tz">
              Time zone (reminders at 8:00 AM local)
            </label>
            <select
              id="tz"
              className="atlassian-select mt-2 min-h-[44px] w-full"
              value={prefs.timezone}
              onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="atlassian-label" htmlFor="df">
              Date format
            </label>
            <select
              id="df"
              className="atlassian-select mt-2 min-h-[44px] w-full"
              value={prefs.date_format}
              onChange={(e) => setPrefs({ ...prefs, date_format: e.target.value })}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="atlassian-label" htmlFor="digest">
              Optional task digest (email)
            </label>
            <select
              id="digest"
              className="atlassian-select mt-2 min-h-[44px] w-full"
              value={prefs.digest_frequency}
              onChange={(e) =>
                setPrefs({ ...prefs, digest_frequency: e.target.value as MatrixPrefs["digest_frequency"] })
              }
              disabled={prefs.pause_all}
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Mondays)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {!preview && message && <p className="text-sm text-brand-700">{message}</p>}

      {!preview && (
        <Button onClick={save} disabled={saving} className="min-h-[44px]">
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      )}
    </div>
  );
}
