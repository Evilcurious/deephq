// Storage for editable site data.
// Uses Vercel Blob when connected (one click in Vercel → Storage → Blob → Connect),
// otherwise falls back to the JSON files bundled in the repo (read-only).
const ADMIN_PASSWORD = 'evil123';
const defaults = {
  'site.json': () => require('../data/site.json'),
  'reviews.json': () => require('../data/reviews.json')
};

const connected = () => !!process.env.BLOB_READ_WRITE_TOKEN;

async function readJson(name) {
  if (connected()) {
    try {
      const { list } = require('@vercel/blob');
      const { blobs } = await list({ prefix: `deephq/${name}`, limit: 1 });
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
    throw new Error('Storage not connected. In Vercel: Storage → Create → Blob → Connect to this project, then redeploy.');
  }
  const { put } = require('@vercel/blob');
  await put(`deephq/${name}`, JSON.stringify(data, null, 2), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60
  });
}

const isAdmin = (req) => req.headers['x-admin-password'] === (process.env.ADMIN_PASSWORD || ADMIN_PASSWORD);

module.exports = { readJson, writeJson, isAdmin, connected };
