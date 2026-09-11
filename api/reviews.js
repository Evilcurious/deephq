// GET /api/reviews (public) | POST /api/reviews (public, add) | DELETE /api/reviews?id= (admin)
const { readJson, writeJson, isAdmin } = require('../lib/store');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.status(200).json({ reviews: await readJson('reviews.json') });
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (b.website) return res.status(200).json({ ok: true }); // honeypot
      const name = String(b.name || '').trim().slice(0, 60);
      const business = String(b.business || '').trim().slice(0, 80);
      const text = String(b.text || '').trim().slice(0, 600);
      const rating = Math.min(5, Math.max(1, parseInt(b.rating, 10) || 0));
      if (!name || !text || !b.rating) return res.status(400).json({ error: 'Name, rating and review text are required' });
      const reviews = await readJson('reviews.json');
      const review = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, business, rating, text, date: new Date().toISOString().slice(0, 10) };
      reviews.unshift(review);
      await writeJson('reviews.json', reviews);
      return res.status(200).json({ ok: true, review });
    }
    if (req.method === 'DELETE') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const id = (req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id');
      const reviews = (await readJson('reviews.json')).filter(r => r.id !== id);
      await writeJson('reviews.json', reviews);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
