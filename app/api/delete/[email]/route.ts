import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;
  const addr = decodeURIComponent(email).toLowerCase();
  if (!addr.endsWith("@zekoro.fun")) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }
  try {
    await getRedis().del(`inbox:${addr}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }
}
