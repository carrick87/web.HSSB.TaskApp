# Email notifications (Resend)

Multi-tenant transactional email uses the **Resend** npm SDK server-side only, React Email templates, and an **`email_outbox`** queue processed by Vercel Cron.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key (omit in local/preview to log emails instead of sending) |
| `EMAIL_FROM` | From address, e.g. `TaskApp <notifications@yourdomain.com>` |
| `APP_URL` | Public app URL for links (fallback: `NEXT_PUBLIC_APP_URL`) |
| `CRON_SECRET` | Bearer token for `GET /api/cron/email` |
| `RESEND_WEBHOOK_SECRET` | Svix secret for `POST /api/webhooks/resend` |
| `EMAIL_UNSUBSCRIBE_SECRET` | HMAC secret for unsubscribe tokens (fallback: `CRON_SECRET`) |

## Migration

Apply **`supabase/migrations/015_email_notifications.sql`** after `014` (not applied to production by this agent).

Adds: `profiles.timezone`, `email_suppressed`, `notification_events`, `email_preferences`, `task_watchers`, `email_outbox`, `email_send_log`, `email_reminder_state`.

## Flow

1. App code calls **`emitNotification`** (`lib/notifications/emit.ts`) for in-app + email from one event.
2. Rows land in **`email_outbox`** (service role only via RLS).
3. **`GET /api/cron/email`** (every 5 minutes, see `vercel.json`) runs `processEmailOutbox`, reminders, and digests.
4. Task activity emails batch **5 minutes** per task/recipient (`batch_key` merge in worker).
5. **`POST /api/webhooks/resend`** marks bounces/complaints and sets `profiles.email_suppressed`.

## User settings

**`/settings/notifications`** — per-org toggles for task activity, reminders, membership updates, digest frequency, and profile timezone (default `Asia/Kuching`, reminders at ~8:00 local).

Invites and security emails ignore preferences.

## Unsubscribe

Non-essential emails include signed **`List-Unsubscribe`** headers and `/api/email/unsubscribe?token=…` (one-click POST supported).

## Cron

```json
{
  "crons": [{ "path": "/api/cron/email", "schedule": "*/5 * * * *" }]
}
```

## Preview templates locally

Visit **`/email-preview`** in development to render all templates (used for screenshot capture).

## Design rules (implemented)

- **Subjects** lead with who did what (e.g. assign preheader `Ali assigned you: Fix loading bay door`); task threads use a **stable subject** equal to the task title.
- **From** display name: `{Workspace} via {PRODUCT_NAME}` (email address from `EMAIL_FROM`).
- **Preheader** (`Preview`) on every template.
- **Task emails** use a 600px white card, logo on white, details table, quoted comments, 44px `#0052CC` HTML button, plain-text part.
- **Threading**: `In-Reply-To` / `References` → `<task-{taskId}@{domain}>`, unique `Message-ID` per send.
- **Footer**: reason line, manage notifications + unsubscribe links, org postal address (fallback `PRODUCT_POSTAL_ADDRESS` in `src/config/product.ts`; required on digests).
- **Dates**: recipient `timezone` + `date_format` on profile (default `DD/MM/YYYY`, `Asia/Kuching`).
- **Settings grid**: `/settings/notifications` — rows Invites / Task activity / Reminders / Security × Email / In-app / Push (push disabled).

Apply **`016_email_design_preferences.sql`** after `015` for pause-all, in-app columns, and thread registry.
