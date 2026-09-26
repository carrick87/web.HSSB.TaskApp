import { NextResponse } from "next/server";

/** Legacy route — use /settings/members after multitenant migration. */
export async function GET() {
  return NextResponse.json(
    { error: "Use Organization settings at /settings/organization." },
    { status: 410 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Use Organization settings at /settings/organization." },
    { status: 410 }
  );
}
