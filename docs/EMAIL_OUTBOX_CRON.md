# Email outbox cron (Supabase)

Vercel Hobby allows only daily cron jobs. **Outbox delivery every 5 minutes** is handled on Supabase, not Vercel.

## Chosen approach: pg_cron + pg_net

1. Store `CRON_SECRET` and your app URL in **Supabase Vault** (or project secrets referenced from SQL).
2. Enable extensions: `pg_cron`, `pg_net` (Dashboard → Database → Extensions).
3. Schedule in the Supabase SQL editor (adjust URL):

```sql
SELECT cron.schedule(
  'taskapp-email-outbox',
  '*/5 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://YOUR_APP.vercel.app/api/cron/email?scope=outbox',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1
      )
    ),
    timeout_milliseconds := 55000
  );
  $$
);
```

## Vercel (daily)

`vercel.json` calls `/api/cron/email?scope=scheduled` at `0 1 * * *` UTC for reminder and digest batch jobs only.

## Manual / full run

`GET /api/cron/email` with `Authorization: Bearer $CRON_SECRET` runs outbox + scheduled (default `scope=full`).
