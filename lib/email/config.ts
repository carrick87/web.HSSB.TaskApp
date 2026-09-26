import { PRODUCT_NAME } from "@/src/config/product";

export function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? `${PRODUCT_NAME} <notifications@example.com>`,
    appUrl: (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
    cronSecret: process.env.CRON_SECRET ?? "",
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? "",
    signingSecret: process.env.EMAIL_UNSUBSCRIBE_SECRET ?? "",
    previewSecret: process.env.EMAIL_PREVIEW_SECRET ?? "",
  };
}

export function isEmailSendingEnabled() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
