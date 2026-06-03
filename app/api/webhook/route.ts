import { NextRequest, NextResponse } from "next/server";
import { getRedis, INBOX_TTL, MAX_EMAILS } from "@/lib/redis";

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  receivedAt: string;
}

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

  const msg: EmailMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: (body.from as string) ?? "unknown",
    to,
    subject: (body.subject as string) ?? "(no subject)",
    text: (body.text as string) ?? "",
    html: body.html as string | undefined,
    receivedAt: new Date().toISOString(),
  };

  try {
    const redis = getRedis();
    const key = `inbox:${to}`;
    await redis.lpush(key, JSON.stringify(msg));
    await redis.ltrim(key, 0, MAX_EMAILS - 1);
    await redis.expire(key, INBOX_TTL);
  } catch (e) {
    console.error("Redis error:", e);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
