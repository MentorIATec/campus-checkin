const STORE_KEY = '__campusCheckinRateLimits';

function getStore() {
  if (!globalThis[STORE_KEY]) globalThis[STORE_KEY] = new Map();
  return globalThis[STORE_KEY];
}

function getClientAddress(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.socket?.remoteAddress || 'unknown');
}

function getClientId(req) {
  const supplied = String(req.headers['x-checkin-client'] || '').trim();
  return /^[A-Za-z0-9_-]{16,80}$/.test(supplied) ? supplied : 'no-client-id';
}

export function consumeRateLimit(req, options) {
  const now = Date.now();
  const namespace = options.namespace;
  const windowMs = options.windowMs;
  const limit = options.limit;
  const identity = options.ipOnly
    ? getClientAddress(req)
    : `${getClientAddress(req)}|${getClientId(req)}`;
  const key = `${namespace}|${identity}`;
  const store = getStore();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    pruneExpired(store, now);
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  current.count += 1;
  if (current.count <= limit) {
    return { allowed: true, remaining: limit - current.count, retryAfter: 0 };
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

export function clearRateLimit(req, namespace) {
  getStore().delete(`${namespace}|${getClientAddress(req)}`);
}

function pruneExpired(store, now) {
  if (store.size < 1000) return;
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) store.delete(key);
  }
}
