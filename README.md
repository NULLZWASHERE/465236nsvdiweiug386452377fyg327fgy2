# zekoro.fun — Free Disposable Email (Cloudflare Workers)

100% Cloudflare. No Vercel, no Upstash. Workers + KV + Email Routing.

## Deploy in 4 steps

### 1. Install & login
```bash
npm install
npx wrangler login
```

### 2. Create the KV namespace
```bash
npx wrangler kv namespace create EMAILS_KV
```
Copy the returned `id` into `wrangler.toml` (replace `YOUR_KV_NAMESPACE_ID` in both places).

### 3. Deploy the worker
```bash
npm run deploy
```
Your worker is live at `https://zekoro-fun.YOUR-SUBDOMAIN.workers.dev`

### 4. Point your domain
In the Cloudflare dashboard → Workers & Pages → your worker → Settings → Domains & Routes
→ Add `zekoro.fun/*`

---

## Set up email receiving

In Cloudflare dashboard → **Email** → **Email Routing**:
1. Enable Email Routing for `zekoro.fun`
2. Go to **Routing Rules** → **Catch-all** → Action: **Send to a Worker** → select `zekoro-fun`

That's it. Emails sent to `anything@zekoro.fun` will be stored in KV and appear in the inbox automatically.

---

## Local dev
```bash
npm run dev
```
Opens on `http://localhost:5000`. KV is simulated locally by wrangler.

## Architecture

```
Email arrives at *@zekoro.fun
      ↓
Cloudflare Email Routing
      ↓
Worker email() handler → stores in KV (24h TTL)
      ↓
Browser polls /api/inbox/:email every 8s
      ↓
Worker reads from KV → returns JSON
```

Everything runs inside one Cloudflare Worker. Zero external dependencies.
