const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../lib/store');
const { checkRateLimit } = require('../lib/ratelimit');
const { logProxyCreated, logProxyRequest } = require('../lib/logger');

function getIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}

async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const ip = getIp(req);
  if (!checkRateLimit(`register:${ip}`, 20, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many registrations from this IP. Try again later.' });
  }

  const { url, label } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Webhook URL is required.' });

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  const id = uuidv4().replace(/-/g, '').slice(0, 16);
  const createdAt = new Date().toISOString();
  const safeLabel = label ? String(label).slice(0, 60) : 'Unnamed Webhook';

  const store = getStore();
  store.webhooks[id] = { url, label: safeLabel, createdAt };
  store.stats[id] = { hits: 0, lastHit: null, errors: 0 };
  saveStore(store);

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const proxyUrl = `${proto}://${req.headers.host}/api/proxy/${id}`;
  logProxyCreated({ ip, proxyId: id, realUrl: url, label: safeLabel, proxyUrl });

  res.status(200).json({ id, proxyUrl, label: safeLabel, createdAt });
}

async function handleProxy(req, res, id) {
  const ip = getIp(req);

  if (!checkRateLimit(`proxy:${ip}:${id}`, 30, 60 * 1000)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 30 requests per minute.' });
  }

  const store = getStore();
  const webhook = store.webhooks[id];
  if (!webhook) return res.status(404).json({ error: 'Proxy not found.' });

  const entry = store.stats[id] || { hits: 0, lastHit: null, errors: 0 };
  entry.hits++;
  entry.lastHit = new Date().toISOString();
  store.stats[id] = entry;

  const forwardHeaders = {
    'content-type': req.headers['content-type'] || 'application/json',
    'user-agent': 'WebhookProxy/1.0',
    'x-forwarded-for': ip,
    'x-proxy-timestamp': new Date().toISOString(),
  };

  for (const h of ['x-github-event','x-github-delivery','x-hub-signature-256','x-slack-signature','x-slack-request-timestamp']) {
    if (req.headers[h]) forwardHeaders[h] = req.headers[h];
  }

  const body = req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined;

  try {
    const response = await axios({
      method: req.method, url: webhook.url,
      headers: forwardHeaders, data: body,
      timeout: 10000, validateStatus: () => true,
    });

    saveStore(store);
    logProxyRequest({ ip, proxyId: id, method: req.method, body, status: response.status });
    res.status(response.status).json({ ok: response.status >= 200 && response.status < 300, status: response.status });
  } catch (err) {
    entry.errors++;
    store.stats[id] = entry;
    saveStore(store);
    logProxyRequest({ ip, proxyId: id, method: req.method, body, error: err.message });
    res.status(502).json({ error: 'Failed to reach target webhook.', detail: err.message });
  }
}

async function handleWebhook(req, res, id) {
  const store = getStore();
  if (!store.webhooks[id]) return res.status(404).json({ error: 'Not found.' });

  if (req.method === 'GET') {
    return res.status(200).json({ id, ...store.webhooks[id], ...store.stats[id] });
  }

  if (req.method === 'DELETE') {
    delete store.webhooks[id];
    delete store.stats[id];
    saveStore(store);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}

module.exports = async (req, res) => {
  const path = (req.url || '').split('?')[0].replace(/\/$/, '');

  const proxyMatch = path.match(/^\/api\/proxy\/([a-zA-Z0-9]+)$/);
  if (proxyMatch) return handleProxy(req, res, proxyMatch[1]);

  const webhookMatch = path.match(/^\/api\/webhooks\/([a-zA-Z0-9]+)$/);
  if (webhookMatch) return handleWebhook(req, res, webhookMatch[1]);

  if (path === '/api/register' || path === '/api') return handleRegister(req, res);

  res.status(404).json({ error: 'Not found.' });
};
