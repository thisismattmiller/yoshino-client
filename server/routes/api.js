import { Router } from 'express';
import db from '../db.js';

const router = Router();
const LAMBDA_URL = process.env.LAMBDA_URL;
const FAIL_SAFE_USAGE_LIMIT = parseInt(process.env.FAIL_SAFE_USAGE_LIMIT || '5000', 10);
const VALID_ACTIONS = ['search', 'lccn2bibid', 'isbn2covers', 'find_similar', 'enrich', 'classify', 'judge_subjects'];

const countSearches = db.prepare("SELECT COUNT(*) as total FROM request_log WHERE action = 'search'");

router.post('/', async (req, res) => {
  const action = req.query.action || 'search';

  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  if (action === 'search') {
    const { total } = countSearches.get();
    if (total >= FAIL_SAFE_USAGE_LIMIT) {
      return res.status(429).json({ error: 'Error: Usage Limit Fail Safe Triggered, ask Matt to increase the limit' });
    }
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
