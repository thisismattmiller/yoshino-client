import { Router } from 'express';
import db from '../db.js';

const router = Router();

const countAll = db.prepare('SELECT COUNT(*) as total FROM request_log');
const countByAction = db.prepare('SELECT action, COUNT(*) as count FROM request_log GROUP BY action ORDER BY count DESC');
const recent = db.prepare('SELECT * FROM request_log ORDER BY id DESC LIMIT 25');
const countRatings = db.prepare('SELECT COUNT(*) as total FROM ratings');
const recentRatings = db.prepare('SELECT * FROM ratings ORDER BY id DESC LIMIT 10');

router.get('/', (req, res) => {
  const total = countAll.get().total;
  const byAction = countByAction.all();
  const last25 = recent.all();
  const totalRatings = countRatings.get().total;
  const lastRatings = recentRatings.all();

  let html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Yoshino Admin</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; padding: 24px; background: #fafafa; color: #1a1a2e; }
  h1 { font-size: 22px; margin-bottom: 20px; }
  h2 { font-size: 16px; margin: 24px 0 10px; color: #555; }
  .stat { display: inline-block; background: #1a1a2e; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 18px; font-weight: 700; margin-right: 10px; margin-bottom: 8px; }
  .stat small { font-weight: 400; font-size: 12px; opacity: 0.7; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  th { background: #f0f0f0; text-align: left; padding: 8px 10px; font-weight: 600; color: #555; }
  td { padding: 8px 10px; border-top: 1px solid #eee; vertical-align: top; }
  tr:hover td { background: #f9f9f9; }
  .mono { font-family: monospace; font-size: 12px; }
  .truncate { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ua { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: #999; }
  .action-tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
  .action-search { background: #e0f2fe; color: #0369a1; }
  .action-other { background: #f0f0f0; color: #555; }
  .tok { font-family: monospace; font-size: 11px; color: #7c3aed; }
  .tok-detail { font-size: 11px; color: #888; }
  .tok-num { font-weight: 600; color: #555; }
  .token-summary { display: flex; flex-direction: column; gap: 2px; }
  .token-summary .tok-row { display: flex; gap: 6px; align-items: center; }
</style>
</head><body>
<h1>Yoshino Admin</h1>

<div>
  <span class="stat">${total}<small>Total API Calls</small></span>
  <span class="stat">${totalRatings}<small>Total Ratings</small></span>
`;

  for (const row of byAction) {
    html += `  <span class="stat">${row.count}<small>${row.action}</small></span>\n`;
  }

  html += `</div>`;

  // Aggregate token usage from recent logs
  const logsWithTokens = last25.filter(r => r.token_usage);
  let totalInput = 0, totalOutput = 0;
  const modelTotals = {};
  for (const row of logsWithTokens) {
    try {
      const tok = JSON.parse(row.token_usage);
      if (tok.by_model) {
        for (const [model, info] of Object.entries(tok.by_model)) {
          if (!modelTotals[model]) modelTotals[model] = { input: 0, output: 0 };
          modelTotals[model].input += info.input_tokens || 0;
          modelTotals[model].output += info.output_tokens || 0;
          totalInput += info.input_tokens || 0;
          totalOutput += info.output_tokens || 0;
        }
      }
    } catch {}
  }

  if (totalInput || totalOutput) {
    html += `
<h2>Token Usage (Last 25 Calls)</h2>
<table>
<tr><th>Model</th><th>Input Tokens</th><th>Output Tokens</th><th>Total Tokens</th></tr>`;
    for (const [model, info] of Object.entries(modelTotals)) {
      html += `<tr>
  <td class="tok">${model}</td>
  <td class="mono">${info.input.toLocaleString()}</td>
  <td class="mono">${info.output.toLocaleString()}</td>
  <td class="mono" style="font-weight:600">${(info.input + info.output).toLocaleString()}</td>
</tr>`;
    }
    html += `<tr style="border-top:2px solid #ccc">
  <td style="font-weight:600">All Models</td>
  <td class="mono" style="font-weight:600">${totalInput.toLocaleString()}</td>
  <td class="mono" style="font-weight:600">${totalOutput.toLocaleString()}</td>
  <td class="mono" style="font-weight:700">${(totalInput + totalOutput).toLocaleString()}</td>
</tr></table>`;
  }

  html += `
<h2>Last 25 API Calls</h2>
<table>
<tr><th>#</th><th>Timestamp</th><th>Action</th><th>Request</th><th>Response</th><th>Tokens</th><th>Duration</th><th>IP</th><th>User Agent</th></tr>
`;

  for (const row of last25) {
    const actionClass = row.action === 'search' ? 'action-search' : 'action-other';
    const reqBody = row.request_body || '';
    const respSummary = row.response_summary || '';
    let tokCell = '—';
    if (row.token_usage) {
      try {
        const tok = JSON.parse(row.token_usage);
        if (tok.by_model) {
          const parts = Object.entries(tok.by_model).map(([m, info]) => {
            const short = m.replace(/^.*?\.(?=[a-z])/i, '').replace(/:.*/, '');
            return `<span class="tok-row"><span class="tok">${short}</span> <span class="tok-num">${info.input_tokens}→${info.output_tokens}</span></span>`;
          });
          tokCell = `<div class="token-summary">${parts.join('')}</div>`;
        }
      } catch {}
    }
    html += `<tr>
  <td class="mono">${row.id}</td>
  <td class="mono">${row.timestamp}</td>
  <td><span class="action-tag ${actionClass}">${row.action}</span></td>
  <td class="mono truncate" title="${reqBody.replace(/"/g, '&quot;')}">${reqBody.slice(0, 80)}${reqBody.length > 80 ? '...' : ''}</td>
  <td class="mono truncate" title="${respSummary.replace(/"/g, '&quot;')}">${respSummary.slice(0, 60)}${respSummary.length > 60 ? '...' : ''}</td>
  <td>${tokCell}</td>
  <td class="mono">${row.duration_ms ?? '—'}ms</td>
  <td class="mono">${row.ip || '—'}</td>
  <td class="ua" title="${(row.user_agent || '').replace(/"/g, '&quot;')}">${row.user_agent || '—'}</td>
</tr>`;
  }

  html += `</table>`;

  if (lastRatings.length) {
    html += `
<h2>Last 10 Ratings</h2>
<table>
<tr><th>#</th><th>Timestamp</th><th>Query</th><th>Action</th><th>Rating</th><th>Result ID</th></tr>
`;
    for (const row of lastRatings) {
      html += `<tr>
  <td class="mono">${row.id}</td>
  <td class="mono">${row.timestamp}</td>
  <td class="truncate">${row.query}</td>
  <td><span class="action-tag action-other">${row.action}</span></td>
  <td>${row.rating}</td>
  <td class="mono">${row.result_id || '—'}</td>
</tr>`;
    }
    html += `</table>`;
  }

  html += `</body></html>`;
  res.type('html').send(html);
});

export default router;
