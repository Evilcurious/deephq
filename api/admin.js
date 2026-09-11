// GET  /api/admin  -> current site.json      (requires x-admin-password)
// POST /api/admin  -> save site.json to repo (requires x-admin-password)
// Env vars on Vercel: ADMIN_PASSWORD (default evil123), GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH
const { readJson, writeJson, adminPassword } = require('../lib/github');
const FILE = 'data/site.json';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.headers['x-admin-password'] !== adminPassword()) return res.status(401).json({ error: 'Unauthorized' });
  try {
    if (req.method === 'GET') {
      const { data } = await readJson(FILE);
      return res.status(200).json({ data });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const data = body && body.data;
      if (!data || !Array.isArray(data.services) || !data.whatsapp) return res.status(400).json({ error: 'Invalid data' });
      data.whatsapp = String(data.whatsapp).replace(/\D/g, '');
      await writeJson(FILE, data, 'Update site settings from admin panel');
      return res.status(200).json({ ok: true, message: 'Saved. Live in ~1 minute after redeploy.' });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
