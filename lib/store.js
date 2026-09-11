// Storage for editable site data.
// Uses Vercel Blob when connected (one click in Vercel → Storage → Blob → Connect),
// otherwise falls back to the JSON files bundled in the repo (read-only).
const ADMIN_PASSWORD = 'evil123';
const defaults = {
  'site.json': () => require('../data/site.json'),
  'reviews.json': () => require('../data/reviews.json')
};

// Find the Blob token regardless of the prefix chosen when connecting the store in Vercel
function blobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const k = Object.keys(process.env).find(k => k.endsWith('_READ_WRITE_TOKEN') && process.env[k].startsWith('vercel_blob_'));
  return k ? process.env[k] : null;
}
const connected = () => !!blobToken();

async function readJson(name) {
  if (connected()) {
    try {
      const { list } = require('@vercel/blob');
      const { blobs } = await list({ prefix: `deephq/${name}`, limit: 1, token: blobToken() });
      if (blobs.length) {
        const r = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
        if (r.ok) return await r.json();
      }
    } catch (e) { console.error('blob read failed', e); }
  }
  return defaults[name]();
}

async function writeJson(name, data) {
  if (!connected()) {
    throw new Error('Storage not connected — in Vercel: Storage tab → your Blob store → Connect Project, then Redeploy.');
  }
  const { put } = require('@vercel/blob');
  await put(`deephq/${name}`, JSON.stringify(data, null, 2), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, token: blobToken(),
    contentType: 'application/json', cacheControlMaxAge: 60
  });
}

const isAdmin = (req) => req.headers['x-admin-password'] === (process.env.ADMIN_PASSWORD || ADMIN_PASSWORD);

module.exports = { readJson, writeJson, isAdmin, connected };
