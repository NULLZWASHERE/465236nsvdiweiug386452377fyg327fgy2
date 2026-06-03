import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;

  if (!email || !email.endsWith("@zekoro.fun")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    await redis.del(`inbox:${email.toLowerCase()}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }
}
