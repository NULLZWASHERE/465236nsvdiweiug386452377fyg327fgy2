import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { adjectives } from "@/lib/adjectives";
import { nouns } from "@/lib/adjectives";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 4);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET() {
  const adj = pick(adjectives);
  const noun = pick(nouns);
  const suffix = nanoid();
  const username = `${adj}.${noun}.${suffix}`;
  const email = `${username}@zekoro.fun`;

  return NextResponse.json({ email, username });
}
