// Vercel serverless function: GET returns site.json, POST saves it to the GitHub repo.
// Required env vars on Vercel:
//   ADMIN_PASSWORD  - password for the admin panel
//   GITHUB_TOKEN    - fine-grained token with "Contents: read & write" on this repo
//   GITHUB_REPO     - e.g. "Evilcurious/deephq"
//   GITHUB_BRANCH   - branch to commit to (default "main")

const FILE_PATH = 'data/site.json';

module.exports = async (req, res) => {
  const { ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH = 'main' } = process.env;
  res.setHeader('Cache-Control', 'no-store');

  const auth = req.headers['x-admin-password'];
  if (!ADMIN_PASSWORD || auth !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const api = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'deephq-admin'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${api}?ref=${GITHUB_BRANCH}`, { headers });
      if (!r.ok) throw new Error(`GitHub GET failed: ${r.status}`);
      const j = await r.json();
      const content = Buffer.from(j.content, 'base64').toString('utf8');
      return res.status(200).json({ sha: j.sha, data: JSON.parse(content) });
    }

    if (req.method === 'POST') {
      if (!GITHUB_TOKEN || !GITHUB_REPO) return res.status(500).json({ error: 'GitHub env vars not configured' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const data = body.data;
      if (!data || !Array.isArray(data.services) || !data.whatsapp) {
        return res.status(400).json({ error: 'Invalid data' });
      }
      data.whatsapp = String(data.whatsapp).replace(/\D/g, '');

      // get current sha
      const cur = await fetch(`${api}?ref=${GITHUB_BRANCH}`, { headers });
      const sha = cur.ok ? (await cur.json()).sha : undefined;

      const r = await fetch(api, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Update site settings from admin panel',
          content: Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64'),
          branch: GITHUB_BRANCH,
          sha
        })
      });
      if (!r.ok) throw new Error(`GitHub PUT failed: ${r.status} ${await r.text()}`);
      return res.status(200).json({ ok: true, message: 'Saved. Vercel will redeploy in ~1 minute.' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
