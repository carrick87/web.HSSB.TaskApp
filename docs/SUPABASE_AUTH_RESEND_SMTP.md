# Supabase Auth → Resend SMTP

Keep Supabase Auth emails (confirm sign-up, reset password, magic link) in Supabase, but send them through Resend to avoid Supabase’s built-in email rate limits.

## Resend SMTP settings

In the [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings** → **Authentication** → **SMTP Settings**:

| Field | Value |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (STARTTLS) |
| Username | `resend` |
| Password | Your **Resend API key** (`RESEND_API_KEY`) |
| Sender email | Same domain you verified in Resend (e.g. `notifications@yourdomain.com`) |
| Sender name | Your product name |

Verify the sending domain in [Resend Domains](https://resend.com/domains) before going live.

## App transactional email

TaskApp workspace/task emails use the Resend **HTTP API** via `RESEND_API_KEY` and `EMAIL_FROM` in Vercel — separate from Auth SMTP, but the same domain is recommended.

## Notes

- Do not commit API keys; set `RESEND_API_KEY` and SMTP password in Vercel / Supabase dashboard only.
- Custom SMTP is a dashboard change; no migration required.
