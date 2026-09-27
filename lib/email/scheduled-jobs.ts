import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailConfig } from "./config";
import { getLocalTimeParts, isEightAmWindow } from "./timezone";
import { EMAIL_TEMPLATES } from "./templates-keys";
import { taskUrl } from "./urls";
import { enqueueDirectEmail } from "./enqueue";
import {
  buildDigestTaskRows,
  countDueToday,
  shouldSkipDigest,
} from "./digest";
import { formatDateInTimezone } from "./format";

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function runReminderAndDigestJobs() {
  const admin = createAdminClient();
  const config = getEmailConfig();
  const now = new Date();
  let reminders = 0;
  let digests = 0;

  const { data: rows } = await admin
    .from("organization_members")
    .select("org_id, user_id, profiles!inner(id, timezone, date_format, email_suppressed, auth_email, harrison_email, username)")
    .eq("status", "active");

  for (const row of rows ?? []) {
    const profile = row.profiles as unknown as {
      id: string;
      timezone: string;
      date_format: string | null;
      email_suppressed: boolean;
      auth_email: string;
      harrison_email: string | null;
      username: string;
    };
    if (profile.email_suppressed) continue;
    const tz = profile.timezone || "Asia/Kuching";
    if (!isEightAmWindow(now, tz)) continue;

    const local = getLocalTimeParts(now, tz);

    const { data: prefs } = await admin
      .from("email_preferences")
      .select("*")
      .eq("user_id", row.user_id)
      .eq("org_id", row.org_id)
      .maybeSingle();

    const email = profile.harrison_email ?? profile.auth_email;
    if (!email) continue;

    if (prefs?.reminders !== false) {
      const { data: sent } = await admin
        .from("email_reminder_state")
        .select("user_id")
        .eq("user_id", row.user_id)
        .eq("org_id", row.org_id)
        .eq("reminder_date", local.dateStr)
        .maybeSingle();

      if (!sent) {
        const tomorrow = addDays(local.dateStr, 1);
        const { data: tasks } = await admin
          .from("tasks")
          .select("id, title, due_date, status")
          .eq("org_id", row.org_id)
          .eq("assignee_id", row.user_id)
          .neq("status", "done")
          .not("due_date", "is", null);

        const items: { title: string; url: string; dueLabel: string }[] = [];
        for (const t of tasks ?? []) {
          const due = String(t.due_date).slice(0, 10);
          let bucket: string | null = null;
          if (due < local.dateStr) bucket = "Overdue";
          else if (due === local.dateStr) bucket = "Due today";
          else if (due === tomorrow) bucket = "Due tomorrow";
          if (bucket) {
            items.push({
              title: t.title,
              url: taskUrl(t.id),
              dueLabel: bucket,
            });
          }
        }

        if (items.length) {
          await enqueueDirectEmail({
            orgId: row.org_id,
            recipientEmail: email,
            template: EMAIL_TEMPLATES.TASK_REMINDERS,
            payload: {
              recipientUserId: row.user_id,
              bucket: "Tasks due today, tomorrow, and overdue",
              tasks: items,
            },
            idempotencyKey: `reminder:${row.org_id}:${row.user_id}:${local.dateStr}`,
          });
          await admin.from("email_reminder_state").insert({
            user_id: row.user_id,
            org_id: row.org_id,
            reminder_date: local.dateStr,
          });
          reminders++;
        }
      }
    }

    const digestFreq = prefs?.digest_frequency ?? "off";
    const runWeekly = digestFreq === "weekly" && local.weekday === "Mon";
    const runDaily = digestFreq === "daily";
    if (runDaily || runWeekly) {
      const digestKey = `digest:${row.org_id}:${row.user_id}:${local.dateStr}:${digestFreq}`;
      const { data: existing } = await admin
        .from("email_outbox")
        .select("id")
        .eq("idempotency_key", digestKey)
        .maybeSingle();
      if (existing) continue;

      const { data: openTasks } = await admin
        .from("tasks")
        .select("id, title, due_date, status")
        .eq("org_id", row.org_id)
        .eq("assignee_id", row.user_id)
        .neq("status", "done");

      const tasks = openTasks ?? [];
      const openCount = tasks.length;
      const overdueCount = tasks.filter(
        (t) => t.due_date && String(t.due_date).slice(0, 10) < local.dateStr
      ).length;
      const dueTodayCount = countDueToday(tasks, local.dateStr);

      if (shouldSkipDigest(openCount, overdueCount)) continue;

      const dateFormat = profile.date_format ?? "DD/MM/YYYY";
      const digestTasks = buildDigestTaskRows(
        tasks,
        local.dateStr,
        taskUrl,
        (iso) => formatDateInTimezone(iso, tz, dateFormat)
      );

      await enqueueDirectEmail({
        orgId: row.org_id,
        recipientEmail: email,
        template: EMAIL_TEMPLATES.TASK_DIGEST,
        payload: {
          recipientUserId: row.user_id,
          frequency: runWeekly ? "Weekly" : "Daily",
          openCount,
          dueTodayCount,
          overdueCount,
          summaryDate: local.dateStr,
          tasks: digestTasks,
          dashboardUrl: `${config.appUrl}/dashboard`,
        },
        idempotencyKey: digestKey,
      });
      digests++;
    }
  }

  return { reminders, digests };
}
