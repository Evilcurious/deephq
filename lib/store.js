// Storage for editable site data (services, prices, stats, WhatsApp number, reviews).
// Uses Vercel Blob. Falls back to the JSON files in /data when Blob isn't connected (read-only).
const ADMIN_PASSWORD = 'evil123';
const defaults = {
  'site.json': () => require('../data/site.json'),
  'reviews.json': () => require('../data/reviews.json')
};

// Locate the Blob token no matter what prefix Vercel used when connecting the store.
function blobToken() {
  const env = process.env;
  if (env.BLOB_READ_WRITE_TOKEN) return env.BLOB_READ_WRITE_TOKEN;
  for (const k of Object.keys(env)) {
    if (/READ_WRITE_TOKEN$/i.test(k) && typeof env[k] === 'string' && env[k].startsWith('vercel_blob_')) return env[k];
  }
  for (const k of Object.keys(env)) {
    if (typeof env[k] === 'string' && env[k].startsWith('vercel_blob_rw_')) return env[k];
  }
  return null;
}
const connected = () => !!blobToken();

function diagnostics() {
  const env = process.env;
  return {
    env: env.VERCEL_ENV || 'local',
    branch: env.VERCEL_GIT_COMMIT_REF || '',
    tokenKeys: Object.keys(env).filter(k => /READ_WRITE_TOKEN$/i.test(k) || /^BLOB_/i.test(k)),
    connected: connected()
  };
}

async function readJson(name) {
  const token = blobToken();
  if (token) {
    try {
      const { list } = require('@vercel/blob');
      const { blobs } = await list({ prefix: `deephq/${name}`, limit: 1, token });
      if (blobs.length) {
        const r = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
        if (r.ok) return await r.json();
      }
    } catch (e) { console.error('blob read failed', e); }
  }
  return defaults[name]();
}

async function writeJson(name, data) {
  const token = blobToken();
  if (!token) {
    const d = diagnostics();
    throw new Error(`Storage not connected (environment: ${d.env}${d.branch ? ', branch: ' + d.branch : ''}; blob vars found: ${d.tokenKeys.join(', ') || 'none'}). In Vercel: Storage → your Blob store → Connect Project → enable ALL environments → Redeploy.`);
  }
  const { put } = require('@vercel/blob');
  await put(`deephq/${name}`, JSON.stringify(data, null, 2), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, token,
    contentType: 'application/json', cacheControlMaxAge: 0
  });
}

const isAdmin = (req) => req.headers['x-admin-password'] === (process.env.ADMIN_PASSWORD || ADMIN_PASSWORD);

module.exports = { readJson, writeJson, isAdmin, connected, diagnostics };
