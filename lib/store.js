// Storage for editable site data (services, prices, stats, WhatsApp number, reviews).
// Uses Vercel Blob. Falls back to the JSON files in /data when Blob isn't connected (read-only).
//
// Vercel hands Blob credentials to a deployment in one of two shapes:
//   1. OIDC — the default for newly connected stores: the project gets BLOB_STORE_ID and a
//      short-lived identity token is attached to each request (there is no long-lived secret).
//      @vercel/blob resolves that itself from the request context / VERCEL_OIDC_TOKEN.
//   2. Read-write token — legacy stores: BLOB_READ_WRITE_TOKEN, or the same value under a
//      custom env prefix (e.g. MYSTORE_READ_WRITE_TOKEN).
// Both are detected here; the SDK does the actual authenticating.
const ADMIN_PASSWORD = 'evil123';
const defaults = {
  'site.json': () => require('../data/site.json'),
  'reviews.json': () => require('../data/reviews.json')
};

// Blob store id, no matter what prefix Vercel used when connecting the store.
function blobStoreId() {
  const env = process.env;
  if (typeof env.BLOB_STORE_ID === 'string' && env.BLOB_STORE_ID.trim()) return env.BLOB_STORE_ID.trim();
  for (const k of Object.keys(env)) {
    if (/BLOB_STORE_ID$/i.test(k) && typeof env[k] === 'string' && env[k].trim()) return env[k].trim();
  }
  return null;
}

// Legacy read-write token, no matter what prefix Vercel used when connecting the store.
function blobReadWriteToken() {
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

// Which store are we talking to? OIDC wins when a store id is present: that is the store
// Vercel connected to this project, and it is also the SDK's own default resolution order.
function blobAuth() {
  const storeId = blobStoreId();
  if (storeId) return { kind: 'oidc', storeId };
  const token = blobReadWriteToken();
  if (token) return { kind: 'token', token };
  return null;
}

const connected = () => !!blobAuth();

function diagnostics() {
  const env = process.env;
  const auth = blobAuth();
  return {
    env: env.VERCEL_ENV || 'local',
    branch: env.VERCEL_GIT_COMMIT_REF || '',
    mode: auth ? auth.kind : 'none',
    storeId: blobStoreId() || '',
    // A per-request OIDC token lives in the request context (not visible from here), so this
    // only reports the pulled/static token — purely informational.
    oidcTokenVar: !!env.VERCEL_OIDC_TOKEN,
    tokenKeys: Object.keys(env).filter(k => /READ_WRITE_TOKEN$/i.test(k) || /BLOB_STORE_ID$/i.test(k)),
    connected: !!auth
  };
}

// Auth options to hand to @vercel/blob, merged with call-specific options.
// Returns null when no Blob store is connected at all.
function blobOptions(extra) {
  const auth = blobAuth();
  if (!auth) return null;
  return auth.kind === 'oidc' ? { ...extra, storeId: auth.storeId } : { ...extra, token: auth.token };
}

// Turn SDK auth failures into instructions that make sense in the Vercel dashboard.
function explain(e) {
  const msg = String((e && e.message) || e);
  const env = process.env.VERCEL_ENV || 'local';
  if (/oidc/i.test(msg) && /environment/i.test(msg)) {
    return new Error(`Blob store is connected to this project but not to this deployment's environment (${env}). In Vercel: Storage → your Blob store → Connect Project → tick Production and Preview → Redeploy. (${msg})`);
  }
  if (/x-vercel-oidc-token|OIDC token|No blob credentials/i.test(msg)) {
    return new Error(`Blob store is connected with OIDC (BLOB_STORE_ID) but no identity token was available for this request (${env}). OIDC tokens only exist inside Vercel deployments — for local development pull a read-write token with \`vercel env pull\`. (${msg})`);
  }
  return e;
}

async function readJson(name) {
  const opts = blobOptions({ prefix: `deephq/${name}`, limit: 1 });
  if (opts) {
    try {
      const { list } = require('@vercel/blob');
      const { blobs } = await list(opts);
      if (blobs.length) {
        const r = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
        if (r.ok) return await r.json();
      }
    } catch (e) { console.error('blob read failed', explain(e).message); }
  }
  return defaults[name]();
}

async function writeJson(name, data) {
  const opts = blobOptions({
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 0
  });
  if (!opts) {
    const d = diagnostics();
    throw new Error(`Storage not connected (environment: ${d.env}${d.branch ? ', branch: ' + d.branch : ''}; blob vars found: ${d.tokenKeys.join(', ') || 'none'}). In Vercel: Storage → your Blob store → Connect Project → tick Production and Preview → Redeploy. Stores connected with OIDC (BLOB_STORE_ID) and with a read-write token both work.`);
  }
  const { put } = require('@vercel/blob');
  try {
    await put(`deephq/${name}`, JSON.stringify(data, null, 2), opts);
  } catch (e) { throw explain(e); }
}

const isAdmin = (req) => req.headers['x-admin-password'] === (process.env.ADMIN_PASSWORD || ADMIN_PASSWORD);

module.exports = { readJson, writeJson, isAdmin, connected, diagnostics };
