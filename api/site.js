// Public: GET /api/site -> current site settings
const { readJson } = require('../lib/store');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.status(200).json(await readJson('site.json')); }
  catch (e) { res.status(500).json({ error: e.message }); }
};
