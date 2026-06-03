const fs = require('fs');
const path = require('path');
const axios = require('axios');

const LOG_PATH = process.env.VERCEL
  ? '/tmp/zekoro-audit.log'
  : path.join(__dirname, '..', 'data', 'audit.log');

const MAX_LINES = 10000;
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1511568092717912177/iVJKUti2_tNVNkSBSo8gpL8Q-G6eU276qPxMBWbcVvIMClTplymmWCR726zOl6PC1G5R';

function ensureDir() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function trimLog() {
  try {
    if (!fs.existsSync(LOG_PATH)) return;
    const content = fs.readFileSync(LOG_PATH, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    if (lines.length > MAX_LINES) {
      fs.writeFileSync(LOG_PATH, lines.slice(lines.length - MAX_LINES).join('\n') + '\n', 'utf8');
    }
  } catch {}
}

function writeLog(entry) {
  try {
    ensureDir();
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
    console.log('[AUDIT]', JSON.stringify(entry));
    trimLog();
  } catch (e) {
    console.error('Logger write error:', e.message);
  }
}

async function sendDiscord(embed) {
  if (!DISCORD_WEBHOOK) return;
  try {
    await axios.post(DISCORD_WEBHOOK, { embeds: [embed] }, { timeout: 5000 });
  } catch (e) {
    console.error('Discord log error:', e.message);
  }
}

function logProxyCreated({ ip, proxyId, realUrl, label, proxyUrl }) {
  const entry = {
    event: 'PROXY_CREATED',
    timestamp: new Date().toISOString(),
    ip,
    proxyId,
    realUrl,
    label,
    proxyUrl,
  };
  writeLog(entry);

  const maskedUrl = realUrl.replace(/(https?:\/\/[^/]+)(.{8})[^/]*(\/.*)?$/, '$1$2…$3');

  sendDiscord({
    color: 0x22c55e,
    author: { name: 'zekoro.fun — Proxy Created' },
    title: `🔗 ${label}`,
    fields: [
      { name: 'Proxy ID', value: `\`${proxyId}\``, inline: true },
      { name: 'IP Address', value: `\`${ip}\``, inline: true },
      { name: 'Proxy URL', value: proxyUrl, inline: false },
      { name: 'Real URL (masked)', value: `\`${maskedUrl}\``, inline: false },
    ],
    footer: { text: 'PROXY_CREATED' },
    timestamp: entry.timestamp,
  });
}

function logProxyRequest({ ip, proxyId, method, body, status, error }) {
  const bodyStr = body !== undefined
    ? (typeof body === 'string' ? body : JSON.stringify(body)).slice(0, 2000)
    : null;

  const entry = {
    event: 'PROXY_REQUEST',
    timestamp: new Date().toISOString(),
    ip,
    proxyId,
    method,
    body: bodyStr,
    responseStatus: status || null,
    error: error || null,
  };
  writeLog(entry);

  const isError = !!error || (status && status >= 400);

  sendDiscord({
    color: isError ? 0xef4444 : 0x6366f1,
    author: { name: 'zekoro.fun — Proxy Request' },
    fields: [
      { name: 'Proxy ID', value: `\`${proxyId}\``, inline: true },
      { name: 'IP Address', value: `\`${ip}\``, inline: true },
      { name: 'Method', value: `\`${method}\``, inline: true },
      { name: 'Status', value: error ? `❌ Error: ${error}` : `\`${status}\``, inline: true },
      ...(bodyStr ? [{ name: 'Body', value: `\`\`\`json\n${bodyStr.slice(0, 1000)}\n\`\`\``, inline: false }] : []),
    ],
    footer: { text: 'PROXY_REQUEST' },
    timestamp: entry.timestamp,
  });
}

function getLogs() {
  try {
    ensureDir();
    if (!fs.existsSync(LOG_PATH)) return [];
    return fs.readFileSync(LOG_PATH, 'utf8')
      .split('\n').filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean).reverse();
  } catch { return []; }
}

module.exports = { logProxyCreated, logProxyRequest, getLogs };
