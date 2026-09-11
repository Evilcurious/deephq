// GET  /api/admin -> site settings (password: x-admin-password header)
// POST /api/admin -> save settings
const { readJson, writeJson, isAdmin, connected } = require('../lib/store');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong password' });
  try {
    if (req.method === 'GET') return res.status(200).json({ data: await readJson('site.json'), storage: connected() });
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const data = body && body.data;
      if (!data || !Array.isArray(data.services) || !data.whatsapp) return res.status(400).json({ error: 'Invalid data' });
      data.whatsapp = String(data.whatsapp).replace(/\D/g, '');
      await writeJson('site.json', data);
      return res.status(200).json({ ok: true, message: 'Saved — changes are live now.' });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
