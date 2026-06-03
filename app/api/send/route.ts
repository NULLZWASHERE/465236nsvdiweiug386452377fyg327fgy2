import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email sending not configured. Add RESEND_API_KEY to your Vercel environment variables." }, { status: 503 });
  }

  let body: Record<string, string>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { from, to, subject, text } = body;
  if (!from?.endsWith("@zekoro.fun") || !to || !subject || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Send error:", e);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
