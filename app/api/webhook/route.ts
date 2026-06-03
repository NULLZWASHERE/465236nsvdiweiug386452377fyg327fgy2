import { NextRequest, NextResponse } from "next/server";
import { getRedis, INBOX_TTL, MAX_EMAILS } from "@/lib/redis";

export const runtime = "nodejs";

export interface IncomingEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  receivedAt: string;
  size?: number;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = (body.to as string | undefined)?.toLowerCase();
  const from = (body.from as string | undefined) ?? "unknown@unknown.com";
  const subject = (body.subject as string | undefined) ?? "(no subject)";
  const text = (body.text as string | undefined) ?? "";
  const html = (body.html as string | undefined) ?? undefined;

  if (!to || !to.endsWith("@zekoro.fun")) {
    return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
  }

  const email: IncomingEmail = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    to,
    subject,
    text,
    html,
    receivedAt: new Date().toISOString(),
    size: text.length,
  };

  try {
    const redis = getRedis();
    const key = `inbox:${to}`;
    await redis.lpush(key, JSON.stringify(email));
    await redis.ltrim(key, 0, MAX_EMAILS - 1);
    await redis.expire(key, INBOX_TTL);
  } catch (err) {
    console.error("Redis error:", err);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
