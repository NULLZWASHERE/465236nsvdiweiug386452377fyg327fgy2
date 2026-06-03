const buckets = new Map();

function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key) || [];
  const recent = bucket.filter(t => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

module.exports = { checkRateLimit };
