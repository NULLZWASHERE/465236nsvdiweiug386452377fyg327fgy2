import { Redis } from "@upstash/redis";

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

function getRedis() {
  // Vercel injects these automatically when you connect Upstash via the marketplace
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Connect an Upstash Redis database in your Vercel project → Storage tab.");
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function key(email: string) {
  return `inbox:${email.toLowerCase()}`;
}

export async function readInbox(email: string): Promise<StoredEmail[]> {
  const data = await getRedis().get<StoredEmail[]>(key(email));
  return data ?? [];
}

export async function writeInbox(email: string, msgs: StoredEmail[]): Promise<void> {
  await getRedis().set(key(email), msgs.slice(0, MAX_EMAILS), { ex: TTL });
}

export async function deleteInbox(email: string): Promise<void> {
  await getRedis().del(key(email));
}
