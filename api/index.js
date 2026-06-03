const axios = require("axios");
const crypto = require("crypto");
const { getStore, saveStore } = require("../lib/store");
const { checkRateLimit } = require("../lib/ratelimit");
const { logProxyCreated, logProxyRequest } = require("../lib/logger");

/* ---------------- IP ---------------- */
function getIp(req) {
  return (req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim() || "unknown";
}

/* ---------------- SAFE STORE ---------------- */
function safeStore() {
  let store;
  try {
    store = getStore();
  } catch (e) {
    console.error("getStore failed:", e);
    store = {};
  }

  if (!store.webhooks) store.webhooks = {};
  if (!store.stats) store.stats = {};

  return store;
}

/* ---------------- REGISTER ---------------- */
async function handleRegister(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const ip = getIp(req);

  if (!checkRateLimit(`register:${ip}`, 20, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const body = req.body || {};
  const url = body.url;
  const label = body.label;

  if (!url)
    return res.status(400).json({ error: "Webhook URL required" });

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Only HTTP/HTTPS allowed" });
    }
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const createdAt = new Date().toISOString();
  const safeLabel = label ? String(label).slice(0, 60) : "Unnamed";

  const store = safeStore();

  store.webhooks[id] = {
    url,
    label: safeLabel,
    createdAt,
  };

  store.stats[id] = {
    hits: 0,
    lastHit: null,
    errors: 0,
  };

  try {
    saveStore(store);
  } catch (e) {
    console.error("saveStore failed:", e);
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;

  const proxyUrl = `${proto}://${host}/api/proxy/${id}`;

  logProxyCreated({
    ip,
    proxyId: id,
    realUrl: url,
    label: safeLabel,
    proxyUrl,
  });

  return res.status(200).json({
    id,
    proxyUrl,
    label: safeLabel,
    createdAt,
  });
}

/* ---------------- PROXY ---------------- */
async function handleProxy(req, res, id) {
  const ip = getIp(req);

  if (!checkRateLimit(`proxy:${ip}:${id}`, 30, 60 * 1000)) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  const store = safeStore();
  const webhook = store.webhooks[id];

  if (!webhook)
    return res.status(404).json({ error: "Not found" });

  const stat = store.stats[id] || {
    hits: 0,
    lastHit: null,
    errors: 0,
  };

  stat.hits++;
  stat.lastHit = new Date().toISOString();
  store.stats[id] = stat;

  const forwardHeaders = {
    "content-type": req.headers["content-type"] || "application/json",
    "user-agent": "WebhookProxy/1.0",
    "x-forwarded-for": ip,
    "x-proxy-timestamp": new Date().toISOString(),
  };

  const passthrough = [
    "x-github-event",
    "x-github-delivery",
    "x-hub-signature-256",
    "x-slack-signature",
    "x-slack-request-timestamp",
  ];

  for (const h of passthrough) {
    if (req.headers[h]) forwardHeaders[h] = req.headers[h];
  }

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? req.body
      : undefined;

  try {
    const response = await axios({
      method: req.method,
      url: webhook.url,
      headers: forwardHeaders,
      data: body,
      timeout: 10000,
      validateStatus: () => true,
    });

    try {
      saveStore(store);
    } catch {}

    logProxyRequest({
      ip,
      proxyId: id,
      method: req.method,
      body,
      status: response.status,
    });

    return res.status(response.status).json({
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
    });
  } catch (err) {
    stat.errors++;
    store.stats[id] = stat;

    try {
      saveStore(store);
    } catch {}

    return res.status(502).json({
      error: "Failed to reach webhook",
      detail: err.message,
    });
  }
}

/* ---------------- WEBHOOK INFO ---------------- */
async function handleWebhook(req, res, id) {
  const store = safeStore();

  if (!store.webhooks[id]) {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      id,
      ...store.webhooks[id],
      ...store.stats[id],
    });
  }

  if (req.method === "DELETE") {
    delete store.webhooks[id];
    delete store.stats[id];

    try {
      saveStore(store);
    } catch {}

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

/* ---------------- MAIN ---------------- */
module.exports = async (req, res) => {
  try {
    const path = (req.url || "")
      .split("?")[0]
      .replace(/\/$/, "");

    const proxyMatch = path.match(/^\/api\/proxy\/([a-zA-Z0-9]+)$/);
    if (proxyMatch)
      return handleProxy(req, res, proxyMatch[1]);

    const webhookMatch = path.match(/^\/api\/webhooks\/([a-zA-Z0-9]+)$/);
    if (webhookMatch)
      return handleWebhook(req, res, webhookMatch[1]);

    if (path === "/api/register" || path === "/api") {
      return handleRegister(req, res);
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error("FATAL:", err);
    return res.status(500).json({
      error: "Server crashed",
      detail: err.message,
    });
  }
};
