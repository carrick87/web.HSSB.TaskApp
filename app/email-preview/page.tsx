import { EMAIL_TEMPLATES } from "@/lib/email/templates-keys";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { getEmailConfig } from "@/lib/email/config";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";
import { NotificationSettingsForm } from "@/components/settings/NotificationSettingsForm";

const branding = {
  orgId: "preview-org",
  orgName: "HSSB",
  logoWidePath: null,
  postalAddress: "HSSB Sdn Bhd, 12 Jalan Example, 93000 Kuching, Sarawak",
};

const samples: { key: string; label: string; template: string; payload: Record<string, unknown> }[] = [
  {
    key: "workspace_invite",
    label: "Workspace invite",
    template: EMAIL_TEMPLATES.WORKSPACE_INVITE,
    payload: {
      inviterName: "Alex Chen",
      acceptUrl: "https://app.example.com/invite/demo-token",
      roleLabel: "Member",
    },
  },
  {
    key: "welcome_workspace",
    label: "Welcome workspace",
    template: EMAIL_TEMPLATES.WELCOME_WORKSPACE,
    payload: { ownerName: "Alex", dashboardUrl: "https://app.example.com/dashboard" },
  },
  {
    key: "invite_accepted",
    label: "Invite accepted",
    template: EMAIL_TEMPLATES.INVITE_ACCEPTED,
    payload: { inviteeName: "Jamie", membersUrl: "https://app.example.com/settings/members" },
  },
  {
    key: "role_changed",
    label: "Role changed",
    template: EMAIL_TEMPLATES.ROLE_CHANGED,
    payload: { actorName: "Alex Chen", newRole: "Admin", settingsUrl: "https://app.example.com/settings/organization" },
  },
  {
    key: "removed_from_workspace",
    label: "Removed from workspace",
    template: EMAIL_TEMPLATES.REMOVED_FROM_WORKSPACE,
    payload: { actorName: "Alex Chen", supportUrl: "https://app.example.com/settings/account" },
  },
  {
    key: "task_activity",
    label: "Task activity",
    template: EMAIL_TEMPLATES.TASK_ACTIVITY,
    payload: {
      taskId: "00000000-0000-0000-0000-000000000001",
      taskTitle: "Fix loading bay door",
      taskUrl: "https://app.example.com/pm/tasks/abc",
      taskStatus: "in progress",
      taskDueDateIso: "2026-09-27T00:00:00.000Z",
      taskAssigneeName: "Jamie",
      lines: [
        "Ali assigned you: Fix loading bay door",
        "Ali commented: “Door sensor still offline.”",
      ],
    },
  },
  {
    key: "task_reminders",
    label: "Task reminders",
    template: EMAIL_TEMPLATES.TASK_REMINDERS,
    payload: {
      bucket: "Tasks due today, tomorrow, and overdue",
      tasks: [
        { title: "Review PR", url: "https://app.example.com/pm/tasks/1", dueLabel: "Due today" },
        { title: "Deploy", url: "https://app.example.com/pm/tasks/2", dueLabel: "Overdue" },
      ],
    },
  },
  {
    key: "task_digest",
    label: "Task digest",
    template: EMAIL_TEMPLATES.TASK_DIGEST,
    payload: {
      frequency: "Daily",
      openCount: 5,
      overdueCount: 1,
      activityLines: ["Comment on Ship onboarding emails", "Status changed on QA checklist"],
      dashboardUrl: "https://app.example.com/dashboard",
    },
  },
  {
    key: "account_deleted",
    label: "Account deleted",
    template: EMAIL_TEMPLATES.ACCOUNT_DELETED,
    payload: {},
  },
  {
    key: "workspace_suspended",
    label: "Workspace suspended",
    template: EMAIL_TEMPLATES.WORKSPACE_SUSPENDED,
    payload: { reason: "Billing review in progress." },
  },
  {
    key: "workspace_reactivated",
    label: "Workspace reactivated",
    template: EMAIL_TEMPLATES.WORKSPACE_REACTIVATED,
    payload: {},
  },
];

export default async function EmailPreviewPage() {
  if (process.env.NODE_ENV === "production" && !process.env.EMAIL_PREVIEW_SECRET) {
    return <p className="p-8">Not available.</p>;
  }

  const config = getEmailConfig();
  const unsub = buildUnsubscribeUrl("preview-user", branding.orgId, "task_activity");

  const rendered = await Promise.all(
    samples.map(async (s) => ({
      ...s,
      email: await renderEmailTemplate({
        template: s.template,
        payload: { ...s.payload, recipientUserId: "preview-user" },
        branding,
        appUrl: config.appUrl,
        unsubscribeUrl: s.template.includes("account") || s.template.includes("workspace_suspended") ? undefined : unsub,
        timezone: "Asia/Kuching",
        dateFormat: "DD/MM/YYYY",
      }),
    }))
  );

  return (
    <div className="p-6 space-y-12 bg-neutral-100 min-h-screen">
      <h1 className="text-2xl font-bold">Email template preview</h1>
      {rendered.map((item) => (
        <section key={item.key} id={item.key} className="space-y-2">
          <h2 className="text-lg font-semibold">{item.label}</h2>
          <p className="text-sm text-neutral-700">Subject: {item.email.subject}</p>
          <div
            className="email-preview-frame mx-auto bg-white shadow-md"
            style={{ maxWidth: "100%" }}
            dangerouslySetInnerHTML={{ __html: item.email.html }}
          />
        </section>
      ))}
      <section id="notification-settings" className="space-y-2 bg-white p-6 rounded-lg shadow-md max-w-3xl">
        <NotificationSettingsForm preview />
      </section>
    </div>
  );
}
