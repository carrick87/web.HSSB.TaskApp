import { NextResponse } from "next/server";
import { getEmailConfig } from "@/lib/email/config";
import { processEmailOutbox } from "@/lib/email/send-worker";
import { runReminderAndDigestJobs } from "@/lib/email/scheduled-jobs";

export async function GET(request: Request) {
  const { cronSecret } = getEmailConfig();
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = new URL(request.url).searchParams.get("scope") ?? "full";

  if (scope === "scheduled") {
    const scheduled = await runReminderAndDigestJobs();
    return NextResponse.json({ ok: true, scheduled });
  }

  if (scope === "outbox") {
    const outbox = await processEmailOutbox();
    return NextResponse.json({ ok: true, outbox });
  }

  const outbox = await processEmailOutbox();
  const scheduled = await runReminderAndDigestJobs();
  return NextResponse.json({ ok: true, outbox, scheduled });
}
