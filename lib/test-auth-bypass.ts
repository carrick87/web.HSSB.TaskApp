import { cookies } from "next/headers";

/** Test-only auth bypass for Playwright (never in production). */
export async function getTestAuthBypassUserId(): Promise<string | null> {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.TEST_AUTH_BYPASS !== "1") return null;
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("test-auth-user")?.value?.trim();
  if (fromCookie) return fromCookie;
  const fromEnv = process.env.TEST_AUTH_USER_ID?.trim();
  return fromEnv || null;
}
