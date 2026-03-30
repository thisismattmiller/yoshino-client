import db from '../db.js';

const insertLog = db.prepare(`
  INSERT INTO request_log (action, request_body, response_summary, duration_ms, ip, user_agent)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export default function requestLogger(req, res, next) {
  const start = Date.now();
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const duration = Date.now() - start;
    const action = req.query.action || req.body?.action || 'unknown';

    try {
      const summary = {};
      if (body?.results) summary.result_count = body.results.length;
      if (body?.performance) summary.performance = body.performance;
      if (body?.error) summary.error = body.error;

      insertLog.run(
        action,
        JSON.stringify(req.body),
        JSON.stringify(summary),
        duration,
        req.ip,
        req.get('user-agent') || ''
      );
    } catch (e) {
      console.error('Logger error:', e.message);
    }

    return originalJson(body);
  };

  next();
}
