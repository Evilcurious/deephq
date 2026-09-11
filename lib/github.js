// Small helper for reading/writing JSON files in the GitHub repo (used by the serverless functions).
const { GITHUB_TOKEN, GITHUB_REPO = 'Evilcurious/deephq', GITHUB_BRANCH = 'main' } = process.env;

const headers = () => ({
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'deephq-site'
});

const url = (path) => `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;

async function readJson(path) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not configured');
  const r = await fetch(`${url(path)}?ref=${GITHUB_BRANCH}`, { headers: headers() });
  if (r.status === 404) return { sha: undefined, data: null };
  if (!r.ok) throw new Error(`GitHub read failed: ${r.status}`);
  const j = await r.json();
  return { sha: j.sha, data: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')) };
}

async function writeJson(path, data, message) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not configured');
  const { sha } = await readJson(path);
  const r = await fetch(url(path), {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message, branch: GITHUB_BRANCH, sha,
      content: Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64')
    })
  });
  if (!r.ok) throw new Error(`GitHub write failed: ${r.status} ${await r.text()}`);
}

const adminPassword = () => process.env.ADMIN_PASSWORD || 'evil123';

module.exports = { readJson, writeJson, adminPassword };
