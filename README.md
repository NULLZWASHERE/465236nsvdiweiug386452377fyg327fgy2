# zekoro.fun — Free Disposable Email

Instant disposable email generator built on **Next.js** and deployed on **Vercel**.  
Emails received via **Cloudflare Email Routing** → stored in **Upstash Redis** → shown in the browser.

---

## Deploy

### 1 · Push to GitHub & import on Vercel
Import this repo at [vercel.com/new](https://vercel.com/new).

### 2 · Add Upstash Redis (free)
1. Sign up at [upstash.com](https://upstash.com) → **Create Database**
2. In Vercel → **Environment Variables** add:

| Key | Value |
|-----|-------|
| `UPSTASH_REDIS_REST_URL` | `https://xxxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | `AXxx…` |
| `WEBHOOK_SECRET` | any random string |

### 3 · Add your domain
Vercel → **Domains** → add `zekoro.fun` → follow DNS instructions.

---

## Wire up email receiving (Cloudflare — free)

1. Add `zekoro.fun` to Cloudflare, enable **Email Routing**
2. **Email → Email Routing → Routing Rules → Catch-all**  
   Action: **Send to a Worker** → create a new Worker with this code:

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
      chunks.reduce((a, c) => { const m = new Uint8Array(a.length+c.length); m.set(a); m.set(c,a.length); return m; }, new Uint8Array(0))
    );
    const textMatch = raw.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i);
    const htmlMatch = raw.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i);
    const text = textMatch ? textMatch[1].replace(/=\r?\n/g,'').trim() : raw.split('\r\n\r\n').slice(1).join('\n').trim();

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
        html: htmlMatch ? htmlMatch[1].replace(/=\r?\n/g,'').trim() : undefined,
      }),
    });
  },
};
```

3. Add `WEBHOOK_SECRET` to the Worker's environment variables (same value as Vercel).

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/generate` | Generate a random address |
| `GET` | `/api/inbox/:email` | Fetch messages for an address |
| `POST` | `/api/webhook` | Receive email from Cloudflare Worker |
| `DELETE` | `/api/delete/:email` | Clear an inbox |

### Webhook payload
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
cp .env.example .env.local   # fill in your Upstash credentials
npm install
npm run dev                  # http://localhost:5000
```

## Stack
- **Next.js 15** — framework + serverless API routes
- **Upstash Redis** — email storage (free, 10k req/day)
- **Cloudflare Email Routing + Workers** — email receiving (free)
- **Vercel** — hosting (free hobby tier)

Emails expire after **24 hours**, max **50 per inbox**.
