// Cloudflare KV via REST API — no Upstash, no third-party deps.
// Required env vars (set in Vercel):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_KV_NAMESPACE_ID
//   CLOUDFLARE_API_TOKEN   (needs Workers KV Storage:Edit permission)

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
const TTL_SECONDS = 60 * 60 * 24; // 24 h

function kvBase() {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_KV_NAMESPACE_ID } = process.env;
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_KV_NAMESPACE_ID) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_KV_NAMESPACE_ID must be set.");
  }
  return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}`;
}

function authHeader() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN must be set.");
  return { Authorization: `Bearer ${token}` };
}

function inboxKey(email: string) {
  return `inbox:${email.toLowerCase()}`;
}

export async function readInbox(email: string): Promise<StoredEmail[]> {
  const key = encodeURIComponent(inboxKey(email));
  const res = await fetch(`${kvBase()}/values/${key}`, {
    headers: authHeader(),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`KV read failed: ${res.status}`);
  const text = await res.text();
  try { return JSON.parse(text) as StoredEmail[]; } catch { return []; }
}

export async function writeInbox(email: string, msgs: StoredEmail[]): Promise<void> {
  const key = encodeURIComponent(inboxKey(email));
  const body = JSON.stringify(msgs.slice(0, MAX_EMAILS));
  const res = await fetch(`${kvBase()}/values/${key}?expiration_ttl=${TTL_SECONDS}`, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) throw new Error(`KV write failed: ${res.status}`);
}

export async function deleteInbox(email: string): Promise<void> {
  const key = encodeURIComponent(inboxKey(email));
  await fetch(`${kvBase()}/values/${key}`, {
    method: "DELETE",
    headers: authHeader(),
  });
}
