import { Router } from 'express';
import db from '../db.js';

const router = Router();

const insertRating = db.prepare(`
  INSERT INTO ratings (query, action, result_id, rating, comment, session_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getRatings = db.prepare(`
  SELECT * FROM ratings WHERE query = ? ORDER BY timestamp DESC
`);

const getAllRatings = db.prepare(`
  SELECT * FROM ratings ORDER BY timestamp DESC LIMIT ?
`);

router.post('/', (req, res) => {
  const { query, action, result_id, rating, comment, session_id } = req.body;

  if (!query || !rating) {
    return res.status(400).json({ error: 'Missing required fields: query, rating' });
  }

  try {
    const result = insertRating.run(
      query,
      action || 'search',
      result_id || null,
      rating,
      comment || null,
      session_id || null
    );
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('Rating insert error:', err.message);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

router.get('/', (req, res) => {
  try {
    if (req.query.query) {
      const rows = getRatings.all(req.query.query);
      return res.json(rows);
    }
    const limit = parseInt(req.query.limit) || 50;
    const rows = getAllRatings.all(limit);
    res.json(rows);
  } catch (err) {
    console.error('Rating fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

export default router;
