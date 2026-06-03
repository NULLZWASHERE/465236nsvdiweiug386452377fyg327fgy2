import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const domain = email.split("@")[1];
  if (domain !== "zekoro.fun") {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    const key = `inbox:${email.toLowerCase()}`;
    const messages = await redis.lrange(key, 0, 49);

    const parsed = messages.map((m) => {
      if (typeof m === "string") {
        try { return JSON.parse(m); } catch { return null; }
      }
      return m;
    }).filter(Boolean);

    return NextResponse.json({ emails: parsed });
  } catch {
    return NextResponse.json(
      { error: "Storage not configured. Add Upstash Redis env vars.", emails: [] },
      { status: 503 }
    );
  }
}
