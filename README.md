# zekoro.fun — Free Disposable Email

Instant disposable email generator. No signup, no tracking, emails auto-delete after 24 hours.

## Features

- **Instant email generation** — random `adj.noun.xxxx@zekoro.fun` addresses
- **Auto-polling inbox** — checks every 8 seconds automatically
- **Email reader** — view plain text or HTML emails
- **Copy to clipboard** — one click
- **Clear inbox** — delete all messages instantly
- **Vercel serverless** — deploys for free, scales automatically

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOU/zekoro-fun.git
git push -u origin main
```

### 2. Import on Vercel

Go to [vercel.com/new](https://vercel.com/new) → import your repo.

### 3. Add Upstash Redis (free)

1. Go to [upstash.com](https://upstash.com) → create a free Redis database
2. Copy **REST URL** and **REST Token**
3. In Vercel project settings → **Environment Variables** add:

| Variable | Value |
|----------|-------|
| `UPSTASH_REDIS_REST_URL` | `https://xxxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | `AXxx...` |
| `WEBHOOK_SECRET` | any random string you choose |

### 4. Point your domain

In Vercel → **Domains** → add `zekoro.fun` and follow DNS instructions.

---

## Receive Real Emails

You need to forward incoming mail to your webhook. Two easy options:

### Option A — Cloudflare Email Routing (Free)

1. Add `zekoro.fun` to Cloudflare
2. Go to **Email → Email Routing → Catch-all** → forward to a **Worker**
3. Create a Worker that POSTs to `https://zekoro.fun/api/webhook`:

```js
export default {
  async email(message, env) {
    const text = await new Response(message.raw).text();
    await fetch("https://zekoro.fun/api/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": env.WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.headers.get("subject") ?? "",
        text,
      }),
    });
  },
};
```

### Option B — Mailgun (Free tier)

1. Add domain to Mailgun → set MX records
2. Create an **Inbound Route** → forward to `https://zekoro.fun/api/webhook`
3. Mailgun will POST parsed email JSON automatically

---

## Webhook API

`POST /api/webhook`

```json
{
  "from": "sender@example.com",
  "to": "swift.fox.ab3c@zekoro.fun",
  "subject": "Hello there",
  "text": "Plain text body",
  "html": "<p>Optional HTML body</p>"
}
```

Header: `x-webhook-secret: YOUR_WEBHOOK_SECRET`

## Other API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/generate` | Generate a new random email |
| `GET` | `/api/inbox/:email` | Fetch inbox messages |
| `DELETE` | `/api/delete/:email` | Clear inbox |

---

## Tech Stack

- **Next.js 15** (App Router)
- **Upstash Redis** — email storage (free tier, 10k req/day)
- **Tailwind CSS** — styling
- **Vercel** — serverless hosting

Emails are stored for **24 hours** and capped at **50 per inbox**.
