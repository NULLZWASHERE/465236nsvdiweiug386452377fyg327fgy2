import { renderHTML } from "./ui";

export interface Env {
  EMAILS_KV: KVNamespace;
  WEBHOOK_SECRET?: string;
}

export interface StoredEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  receivedAt: string;
}

const DOMAIN = "zekoro.fun";
const TTL = 60 * 60 * 24; // 24 hours
const MAX_EMAILS = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function inboxKey(email: string): string {
  return `inbox:${email.toLowerCase()}`;
}

async function readInbox(kv: KVNamespace, email: string): Promise<StoredEmail[]> {
  const raw = await kv.get(inboxKey(email), "text");
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredEmail[];
  } catch {
    return [];
  }
}

async function writeInbox(kv: KVNamespace, email: string, msgs: StoredEmail[]): Promise<void> {
  await kv.put(inboxKey(email), JSON.stringify(msgs.slice(0, MAX_EMAILS)), {
    expirationTtl: TTL,
  });
}

// ─── HTTP handler ────────────────────────────────────────────────────────────

async function handleFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,x-webhook-secret",
      },
    });
  }

  // ── GET / → serve the UI ──────────────────────────────────────────────────
  if (pathname === "/" && request.method === "GET") {
    return new Response(renderHTML(), {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  }

  // ── GET /api/generate → generate a random address ─────────────────────────
  if (pathname === "/api/generate" && request.method === "GET") {
    const adjs = ["swift","bold","calm","dark","epic","fast","gold","icy","jade","keen","lazy","mild","neat","odd","pale","quick","rare","slim","tall","vast","warm","zany","azure","brisk","crisp","neon","lunar","misty","pixel","rusty","silver","teal","ultra","vivid","wild","xenon","zinc","amber","blaze","cobalt","drift","ember","flint","ghost","iron","jolly","fierce"];
    const nouns = ["fox","wolf","hawk","bear","deer","lynx","crow","fern","moss","rock","star","moon","wave","dust","mist","leaf","pine","oak","ash","ivy","sage","dawn","void","byte","node","core","flux","prism","cipher","ridge","storm","blade","crest","forge","isle","lark","maze","orbit","pulse","quest","realm","shade","tide","veil","wisp","zone","echo","frost"];
    const alpha = "abcdefghijklmnopqrstuvwxyz0123456789";
    const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const suffix = Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");
    const username = `${pick(adjs)}.${pick(nouns)}.${suffix}`;
    return json({ email: `${username}@${DOMAIN}`, username });
  }

  // ── GET /api/inbox/:email → fetch messages ────────────────────────────────
  const inboxMatch = pathname.match(/^\/api\/inbox\/(.+)$/);
  if (inboxMatch && request.method === "GET") {
    const email = decodeURIComponent(inboxMatch[1]).toLowerCase();
    if (!email.endsWith(`@${DOMAIN}`)) return json({ error: "Invalid domain" }, 400);
    const emails = await readInbox(env.EMAILS_KV, email);
    return json({ emails });
  }

  // ── DELETE /api/delete/:email → clear inbox ───────────────────────────────
  const deleteMatch = pathname.match(/^\/api\/delete\/(.+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const email = decodeURIComponent(deleteMatch[1]).toLowerCase();
    if (!email.endsWith(`@${DOMAIN}`)) return json({ error: "Invalid domain" }, 400);
    await env.EMAILS_KV.delete(inboxKey(email));
    return json({ ok: true });
  }

  // ── POST /api/webhook → optional HTTP webhook (e.g. Mailgun fallback) ─────
  if (pathname === "/api/webhook" && request.method === "POST") {
    const secret = request.headers.get("x-webhook-secret");
    if (env.WEBHOOK_SECRET && secret !== env.WEBHOOK_SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }
    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const to = (body.to as string | undefined)?.toLowerCase();
    if (!to?.endsWith(`@${DOMAIN}`)) return json({ error: "Invalid recipient" }, 400);
    const email: StoredEmail = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: (body.from as string) ?? "unknown",
      to,
      subject: (body.subject as string) ?? "(no subject)",
      text: (body.text as string) ?? "",
      html: (body.html as string | undefined),
      receivedAt: new Date().toISOString(),
    };
    const existing = await readInbox(env.EMAILS_KV, to);
    await writeInbox(env.EMAILS_KV, to, [email, ...existing]);
    return json({ ok: true });
  }

  return new Response("Not found", { status: 404 });
}

// ─── Email handler (Cloudflare Email Routing) ────────────────────────────────

async function handleEmail(
  message: ForwardableEmailMessage,
  env: Env
): Promise<void> {
  const to = message.to.toLowerCase();
  if (!to.endsWith(`@${DOMAIN}`)) {
    message.setReject("Unknown address");
    return;
  }

  // Read the raw email body as text
  const rawReader = message.raw.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await rawReader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const rawText = new TextDecoder().decode(
    chunks.reduce((acc, c) => {
      const merged = new Uint8Array(acc.length + c.length);
      merged.set(acc); merged.set(c, acc.length);
      return merged;
    }, new Uint8Array(0))
  );

  // Extract a plain-text body from the raw email (best-effort)
  const text = extractPlainText(rawText);
  const html = extractHtml(rawText);

  const stored: StoredEmail = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: message.from,
    to,
    subject: message.headers.get("subject") ?? "(no subject)",
    text,
    html,
    receivedAt: new Date().toISOString(),
  };

  const existing = await readInbox(env.EMAILS_KV, to);
  await writeInbox(env.EMAILS_KV, to, [stored, ...existing]);
}

// Very lightweight MIME body extractors (no external deps)
function extractPlainText(raw: string): string {
  // Try to find text/plain part
  const plainMatch = raw.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\r?\nContent-Type:|$)/i);
  if (plainMatch) return plainMatch[1].replace(/=\r?\n/g, "").trim();
  // Fallback: strip headers
  const bodyStart = raw.indexOf("\r\n\r\n");
  if (bodyStart !== -1) return raw.slice(bodyStart + 4).trim();
  return raw.trim();
}

function extractHtml(raw: string): string | undefined {
  const htmlMatch = raw.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\r?\nContent-Type:|$)/i);
  if (htmlMatch) return htmlMatch[1].replace(/=\r?\n/g, "").trim();
  return undefined;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export default {
  fetch: handleFetch,
  email: handleEmail,
} satisfies ExportedHandler<Env>;
