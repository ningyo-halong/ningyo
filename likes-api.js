const VISITOR_KEY = 'ningyo.likes.visitor.v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isConfigured(config) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config?.supabaseUrl || '')
    && typeof config?.publishableKey === 'string'
    && config.publishableKey.startsWith('sb_publishable_');
}

// This random identifier only deduplicates likes. It contains no personal data.
// If browser storage is blocked, it still prevents repeated clicks this visit.
export function getVisitorId(stores, randomUUID) {
  for (const storage of stores) {
    try {
      const existing = storage?.getItem(VISITOR_KEY);
      if (UUID.test(existing || '')) return existing;
    } catch { /* A browser may deny storage access. */ }
  }
  const id = randomUUID();
  if (!UUID.test(id)) throw new Error('Invalid visitor identifier');
  for (const storage of stores) {
    try { storage?.setItem(VISITOR_KEY, id); } catch { /* Use this visit's ID. */ }
  }
  return id;
}

export function createLikesApi(config, fetcher = globalThis.fetch, timeoutMs = 10000) {
  if (!isConfigured(config)) throw new Error('Shared likes are not configured');
  const base = config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/';

  async function request(method, dollId, visitorId) {
    if (!Number.isInteger(dollId) || dollId < 1 || dollId > 43 || !UUID.test(visitorId)) {
      throw new Error('Invalid like request');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(base + method, {
        method: 'POST',
        headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_doll_id: dollId, p_visitor_id: visitorId }),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!response.ok) throw new Error('Shared likes request failed');
      const result = await response.json();
      if (!Number.isSafeInteger(result?.count) || result.count < 0
          || typeof result.liked !== 'boolean'
          || (method === 'ningyo_add_like' && !result.liked)) {
        throw new Error('Invalid shared likes response');
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: (dollId, visitorId) => request('ningyo_get_likes', dollId, visitorId),
    like: (dollId, visitorId) => request('ningyo_add_like', dollId, visitorId),
  };
}
