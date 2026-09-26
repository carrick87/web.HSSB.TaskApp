import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    {
      error:
        "This endpoint is retired. Update member status via organization settings (/api/settings/members).",
    },
    { status: 410 }
  );
}
