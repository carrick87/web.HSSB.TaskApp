/**
 * Application timezone for "today" (task assignment date, dashboard).
 * Use so users in one region see the same calendar day (e.g. Asia/Kuala_Lumpur for Malaysia).
 */
const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Asia/Kuala_Lumpur";

/**
 * Returns today's date (YYYY-MM-DD) in the app timezone.
 * Use this for "Tasks for today", ensureTasksForToday, and any assignment_date filtering.
 */
export function getTodayAppDate(): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}
