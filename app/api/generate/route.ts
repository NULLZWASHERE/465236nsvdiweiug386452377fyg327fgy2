import { NextResponse } from "next/server";

const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randId(n = 8) {
  return Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export async function GET() {
  const username = randId(8);
  return NextResponse.json({ email: `${username}@zekoro.fun`, username });
}
