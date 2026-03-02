import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPrefixes = [
  "/dashboard",
  "/tasks",
  "/profile",
  "/pic",
  "/admin",
  "/leaderboard",
];
const authRoutes = ["/login"];

function isProtected(pathname: string) {
  return protectedPrefixes.some((p) => pathname.startsWith(p));
}

function isAuthRoute(pathname: string) {
  return authRoutes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const res = await updateSession(request);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
