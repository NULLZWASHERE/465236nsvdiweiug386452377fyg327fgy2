import { NextRequest, NextResponse } from "next/server";
import { deleteInbox } from "@/lib/storage";

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
    await deleteInbox(addr);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }
}
