import { NextRequest, NextResponse } from "next/server";
import { readInbox, writeInbox } from "@/lib/storage";
import type { StoredEmail } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const to = (body.to as string | undefined)?.toLowerCase();
  if (!to?.endsWith("@zekoro.fun")) {
    return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
  }

  const msg: StoredEmail = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: (body.from as string) ?? "unknown",
    to,
    subject: (body.subject as string) ?? "(no subject)",
    text: (body.text as string) ?? "",
    html: body.html as string | undefined,
    receivedAt: new Date().toISOString(),
  };

  try {
    const existing = await readInbox(to);
    await writeInbox(to, [msg, ...existing]);
  } catch (e) {
    console.error("KV write error:", e);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
