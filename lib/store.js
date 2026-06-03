const fs = require('fs');
const path = require('path');

const DATA_PATH = process.env.VERCEL
  ? '/tmp/webhooks.json'
  : path.join(__dirname, '..', 'data', 'webhooks.json');

function getStore() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch {}
  return { webhooks: {}, stats: {} };
}

function saveStore(store) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(store), 'utf8');
  } catch (e) {
    console.error('Store write error:', e.message);
  }
}

module.exports = { getStore, saveStore };
