import { Router } from 'express';

const router = Router();
const LAMBDA_URL = process.env.LAMBDA_URL;
const VALID_ACTIONS = ['search', 'lccn2bibid', 'isbn2covers', 'find_similar', 'enrich', 'classify', 'judge_subjects'];

router.post('/', async (req, res) => {
  const action = req.query.action || 'search';

  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  try {
    const payload = { action, ...req.body };
    console.log(`[API] POST ${LAMBDA_URL} ?action=${action}`);
    console.log('[API] Body:', JSON.stringify(payload, null, 2));

    const response = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Lambda proxy error:', err.message);
    res.status(502).json({ error: 'Upstream API error' });
  }
});

export default router;
