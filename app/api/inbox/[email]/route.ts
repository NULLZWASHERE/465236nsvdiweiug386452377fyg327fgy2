import { NextRequest, NextResponse } from "next/server";
import { readInbox } from "@/lib/storage";

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
    const emails = await readInbox(addr);
    return NextResponse.json({ emails });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Storage not configured. Add Cloudflare env vars.", emails: [] },
      { status: 503 }
    );
  }
}
