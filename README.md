# zekoro.fun — Free Disposable Email

Instant disposable email on **Next.js + Vercel**.  
Emails received via **Cloudflare Email Routing** → stored in **Vercel KV** → shown live in the browser.

---

## Deploy

### 1 · Import on Vercel
Go to [vercel.com/new](https://vercel.com/new) and import this repo.

### 2 · Add Vercel KV (one click, no external signup)
In your Vercel project → **Storage** tab → **Create Database** → choose **KV**.  
Vercel automatically injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` into your project. Done.

### 3 · Add one secret
In Vercel → **Environment Variables** add:

| Key | Value |
|-----|-------|
| `WEBHOOK_SECRET` | any random string you choose |

### 4 · Add your domain
Vercel → **Domains** → add `zekoro.fun` → follow the DNS instructions.

---

## Wire up email receiving (Cloudflare — free)

1. Add `zekoro.fun` to Cloudflare and enable **Email Routing**
2. **Email → Email Routing → Routing Rules → Catch-all**  
   Action: **Send to a Worker** → create a Worker with the code below

```js
export default {
  async email(message, env) {
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

    const textMatch = raw.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i);
    const htmlMatch = raw.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i);
    const text = textMatch
      ? textMatch[1].replace(/=\r?\n/g, '').trim()
      : raw.split('\r\n\r\n').slice(1).join('\n').trim();

    await fetch('https://zekoro.fun/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': env.WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.headers.get('subject') ?? '',
        text,
        html: htmlMatch ? htmlMatch[1].replace(/=\r?\n/g, '').trim() : undefined,
      }),
    });
  },
};
```

3. In the Worker → **Settings → Variables** add `WEBHOOK_SECRET` (same value as Vercel).

---

## How it works

```
Email → Cloudflare Email Routing → Worker → POST /api/webhook → Vercel KV
                                                                      ↓
                                             Browser polls /api/inbox every 8s
```

## API routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/generate` | Random `@zekoro.fun` address |
| `GET` | `/api/inbox/:email` | Fetch messages |
| `POST` | `/api/webhook` | Receive email from Cloudflare Worker |
| `DELETE` | `/api/delete/:email` | Clear inbox |

## Local dev
```bash
cp .env.example .env.local
# Fill in KV_REST_API_URL and KV_REST_API_TOKEN from your Vercel project settings
npm install && npm run dev
```

## Stack
- **Next.js 15** — framework + API routes
- **Vercel KV** — email storage (free, added in Vercel dashboard)
- **Cloudflare Email Routing + Workers** — email receiving (free)
- **Vercel** — hosting (free hobby tier)
