/** Simple in-memory TTL cache shared across screen focuses. */
const stores = new Map();

export function getCached(key, ttlMs) {
  const entry = stores.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) return null;
  return entry.value;
}

export function setCached(key, value) {
  stores.set(key, { value, at: Date.now() });
}

export function invalidateCache(key) {
  if (key) stores.delete(key);
  else stores.clear();
}
