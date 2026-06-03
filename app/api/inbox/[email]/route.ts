import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;
  const addr = decodeURIComponent(email).toLowerCase();

  if (!addr.endsWith("@zekoro.fun")) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    const raw = await redis.lrange(`inbox:${addr}`, 0, 49);
    const emails = raw.map((m) => {
      if (typeof m === "string") { try { return JSON.parse(m); } catch { return null; } }
      return m;
    }).filter(Boolean);
    return NextResponse.json({ emails });
  } catch {
    return NextResponse.json({ error: "Storage not configured.", emails: [] }, { status: 503 });
  }
}
