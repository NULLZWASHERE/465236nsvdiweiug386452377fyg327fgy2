import { kv } from "@vercel/kv";

export interface StoredEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  receivedAt: string;
}

const MAX_EMAILS = 50;
const TTL = 60 * 60 * 24; // 24 hours

function key(email: string) {
  return `inbox:${email.toLowerCase()}`;
}

export async function readInbox(email: string): Promise<StoredEmail[]> {
  const data = await kv.get<StoredEmail[]>(key(email));
  return data ?? [];
}

export async function writeInbox(email: string, msgs: StoredEmail[]): Promise<void> {
  await kv.set(key(email), msgs.slice(0, MAX_EMAILS), { ex: TTL });
}

export async function deleteInbox(email: string): Promise<void> {
  await kv.del(key(email));
}
