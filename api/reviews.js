// GET    /api/reviews        -> list reviews (public)
// POST   /api/reviews        -> add a review (public)  { name, business, rating, text }
// DELETE /api/reviews?id=... -> delete a review (requires x-admin-password)
const { readJson, writeJson, adminPassword } = require('../lib/github');
const FILE = 'data/reviews.json';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const { data } = await readJson(FILE);
      return res.status(200).json({ reviews: data || [] });
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const name = String(b.name || '').trim().slice(0, 60);
      const business = String(b.business || '').trim().slice(0, 80);
      const text = String(b.text || '').trim().slice(0, 600);
      const rating = Math.min(5, Math.max(1, parseInt(b.rating, 10) || 0));
      if (!name || !text || !b.rating) return res.status(400).json({ error: 'Name, rating and review text are required' });
      if (b.website) return res.status(200).json({ ok: true }); // honeypot for bots
      const { data } = await readJson(FILE);
      const reviews = Array.isArray(data) ? data : [];
      const review = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, business, rating, text, date: new Date().toISOString().slice(0, 10) };
      reviews.unshift(review);
      await writeJson(FILE, reviews, `Add review from ${name}`);
      return res.status(200).json({ ok: true, review });
    }
    if (req.method === 'DELETE') {
      if (req.headers['x-admin-password'] !== adminPassword()) return res.status(401).json({ error: 'Unauthorized' });
      const id = (req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id');
      const { data } = await readJson(FILE);
      const reviews = (data || []).filter(r => r.id !== id);
      await writeJson(FILE, reviews, 'Delete review from admin panel');
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
