const { getalls, input, ensureUser } = require('./database');

// SPEED: this used to hit the database twice (ensureUser + getalls) on EVERY
// call. Settings change rarely, so keep a short in-memory copy and refresh it
// whenever updateUserConfig() writes.
const CACHE_TTL = 30_000;
const cache = new Map(); // number -> { data, exp }

const clean = (settings) => {
  if (!settings) return {};
  const out = { ...settings };
  delete out._id;
  delete out.__v;
  delete out.NUMBER;
  return out;
};

async function getUserConfig(number) {
  if (!number) return {};
  const sanitized = number.replace(/[^0-9]/g, '');

  const hit = cache.get(sanitized);
  if (hit && hit.exp > Date.now()) return { ...hit.data };

  await ensureUser(sanitized);
  const data = clean(await getalls(sanitized));
  cache.set(sanitized, { data, exp: Date.now() + CACHE_TTL });
  return { ...data };
}

async function updateUserConfig(number, newSettings) {
  if (!number) throw new Error('Number is required');
  const sanitized = number.replace(/[^0-9]/g, '');
  await ensureUser(sanitized);
  for (const [key, value] of Object.entries(newSettings)) {
    await input(key, value, sanitized);
  }
  const data = clean(await getalls(sanitized));
  cache.set(sanitized, { data, exp: Date.now() + CACHE_TTL });
  return { ...data };
}

module.exports = { getUserConfig, updateUserConfig };
