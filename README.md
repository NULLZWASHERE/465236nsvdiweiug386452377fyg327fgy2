# zekoro.fun — Free Disposable Email

Instant disposable email generator built on **Next.js** and deployed on **Vercel**.  
Emails received via **Cloudflare Email Routing** → stored in **Cloudflare KV** → shown in the browser.  
No Upstash. No third-party storage. 100% free.

---

## Deploy in 3 steps

### 1 · Push to GitHub & import on Vercel
Import this repo at [vercel.com/new](https://vercel.com/new).

### 2 · Create a Cloudflare KV namespace
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **KV** → **Create namespace**  
   Name it anything (e.g. `zekoro-emails`). Copy the **Namespace ID**.
2. **My Profile** → **API Tokens** → **Create Token** → use the *"Edit Cloudflare Workers"* template  
   (this gives KV read/write access). Copy the token.
3. Your **Account ID** is shown on the right sidebar of any domain page in Cloudflare.

In Vercel → **Environment Variables** add:

| Key | Value |
|-----|-------|
| `CLOUDFLARE_ACCOUNT_ID` | your account ID |
| `CLOUDFLARE_KV_NAMESPACE_ID` | the namespace ID from step above |
| `CLOUDFLARE_API_TOKEN` | the API token |
| `WEBHOOK_SECRET` | any random string |

### 3 · Add your domain
Vercel → **Domains** → add `zekoro.fun` → follow the DNS instructions.

---

## Wire up email receiving (Cloudflare — free)

1. In Cloudflare dashboard, enable **Email Routing** for `zekoro.fun`
2. **Email → Email Routing → Routing Rules → Catch-all**  
   Action: **Send to a Worker** → create a new Worker with this code:

```js
export default {
  async email(message, env) {
    // Read raw email bytes
    const chunks = [];
    const reader = message.raw.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const raw = new TextDecoder().decode(
      chunks.reduce((a, c) => {
        const m = new Uint8Array(a.length + c.length);
        m.set(a); m.set(c, a.length); return m;
      }, new Uint8Array(0))
    );

    // Extract plain text + HTML
    const textMatch = raw.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i);
    const htmlMatch = raw.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i);
    const text = textMatch
      ? textMatch[1].replace(/=\r?\n/g, '').trim()
      : raw.split('\r\n\r\n').slice(1).join('\n').trim();

    // Store directly in KV
    const to = message.to.toLowerCase();
    const key = `inbox:${to}`;
    const existing = await env.EMAILS_KV.get(key, 'json') ?? [];
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: message.from,
      to,
      subject: message.headers.get('subject') ?? '(no subject)',
      text,
      html: htmlMatch ? htmlMatch[1].replace(/=\r?\n/g, '').trim() : undefined,
      receivedAt: new Date().toISOString(),
    };
    await env.EMAILS_KV.put(key, JSON.stringify([entry, ...existing].slice(0, 50)), {
      expirationTtl: 86400,
    });
  },
};
```

3. In the Worker's **Settings → Variables → KV Namespace Bindings**  
   add a binding: variable name `EMAILS_KV` → select your `zekoro-emails` namespace.

That's it. Emails sent to `anything@zekoro.fun` land in KV and appear in the inbox automatically.

---

## How it works

```
Email arrives at *@zekoro.fun
        ↓
Cloudflare Email Routing
        ↓
Cloudflare Worker → writes to KV namespace
        ↓
Vercel API (/api/inbox) → reads KV via Cloudflare REST API
        ↓
Browser polls every 8s → shows emails
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/generate` | Random `@zekoro.fun` address |
| `GET` | `/api/inbox/:email` | Fetch messages (reads Cloudflare KV) |
| `DELETE` | `/api/delete/:email` | Clear inbox |
| `POST` | `/api/webhook` | Optional HTTP fallback for other email providers |

### Webhook payload (optional fallback)
```json
{
  "from": "sender@example.com",
  "to": "swift.fox.ab3c@zekoro.fun",
  "subject": "Hello",
  "text": "Plain text body",
  "html": "<p>Optional HTML</p>"
}
```
Header: `x-webhook-secret: YOUR_SECRET`

---

## Local dev
```bash
cp .env.example .env.local   # fill in Cloudflare credentials
npm install
npm run dev                  # http://localhost:5000
```

## Stack
- **Next.js 15** — framework + serverless API routes
- **Cloudflare KV** — email storage (free, 100k reads/day)
- **Cloudflare Email Routing + Workers** — email receiving (free)
- **Vercel** — hosting (free hobby tier)

Emails expire after **24 hours**, max **50 per inbox**.
