import { NextResponse } from "next/server";

/** Legacy admin user editor — use /settings/members after multitenant migration. */
export async function PUT() {
  return NextResponse.json(
    { error: "User management moved to /settings/members." },
    { status: 410 }
  );
}
