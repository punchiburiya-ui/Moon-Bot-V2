// lib/remoteCache.js
//
// SPEED: ~25 commands (.menu, .song, .alive, movie, download ...) used to
// `await axios.get(<github raw json>)` BEFORE sending their reply, so every
// command paid a full GitHub round-trip (100ms - several seconds).
//
// This patches axios.get once, for a short list of rarely-changing JSON urls:
//   - first call is fetched (5s timeout) and cached for 10 minutes
//   - concurrent calls share the same in-flight request
//   - if GitHub is slow / down, the last good copy is served instead
// Nothing has to be changed inside the plugins themselves.

const axios = require('axios');

const TTL = 10 * 60_000;
const TIMEOUT = 5_000;
const CACHEABLE = [/mini-bot-details\.json/i, /main_var\.json/i];

const cache = new Map();     // url -> { res, exp }
const inflight = new Map();  // url -> Promise

if (!axios.__remoteCachePatched) {
  axios.__remoteCachePatched = true;
  const originalGet = axios.get.bind(axios);

  const fetchFresh = (url, cfg) => {
    if (inflight.has(url)) return inflight.get(url);
    const p = originalGet(url, { timeout: TIMEOUT, ...(cfg || {}) })
      .then((res) => {
        cache.set(url, { res, exp: Date.now() + TTL });
        return res;
      })
      .finally(() => inflight.delete(url));
    inflight.set(url, p);
    return p;
  };

  axios.get = (url, cfg) => {
    if (typeof url !== 'string' || !CACHEABLE.some((r) => r.test(url))) {
      return originalGet(url, cfg);
    }
    const hit = cache.get(url);
    if (hit && hit.exp > Date.now()) return Promise.resolve(hit.res);
    return fetchFresh(url, cfg).catch((err) => {
      if (hit) return hit.res;          // stale copy beats an error
      throw err;
    });
  };
}

// Warm the cache at startup so even the very first command is instant.
function warmRemoteCache() {
  for (const u of [
    'https://raw.githubusercontent.com/hansamal-200/CONNECT-MSG/refs/heads/main/main/mini-bot-details.json'
  ]) axios.get(u).catch(() => {});
}

module.exports = { warmRemoteCache };
