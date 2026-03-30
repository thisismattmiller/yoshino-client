/**
 * Client-side LCCN to bib ID lookup.
 *
 * Resolves a Library of Congress Control Number (LCCN) to a
 * bibliographic record ID by querying id.loc.gov (or preprod).
 *
 * Usage:
 *   import { lccn2bibid } from './lccn2bibid.js';
 *   const result = await lccn2bibid('78535933');
 */

import { resolveBaseUrl } from './idlocgov.js';

const USER_AGENT = 'LC Yoshino';

/**
 * Look up an LCCN and return the LC bib ID and label.
 *
 * @param {string} lccn - The LCCN string (e.g. "78535933")
 * @returns {Promise<Object>} Result with found, bib_id, location, label (or error)
 */
export async function lccn2bibid(lccn) {
  const base = await resolveBaseUrl();
  const url = `${base}/resources/instances/identifier/${encodeURIComponent(lccn)}`;

  try {
    const resp = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT },
    });

    if (resp.status === 302 || resp.status === 301) {
      const location = resp.headers.get('location') || '';
      const bibId = location.replace(/\/+$/, '').split('/').pop() || '';

      const labelEncoded = resp.headers.get('x-preflabel-encoded') || '';
      let label = labelEncoded ? decodeURIComponent(labelEncoded) : '';
      if (!label) {
        label = resp.headers.get('x-preflabel') || '';
      }

      console.log(`[lccn2bibid] ${lccn} -> bib_id: ${bibId}, label: ${label}`);
      return { found: true, bib_id: bibId, location, label };
    }

    if (resp.status === 404) {
      console.log(`[lccn2bibid] ${lccn}: not found`);
      return { found: false, error: 'LCCN not found' };
    }

    console.log(`[lccn2bibid] ${lccn}: unexpected status ${resp.status}`);
    return { found: false, error: 'Network error with id.loc.gov' };
  } catch (e) {
    console.log(`[lccn2bibid] ${lccn}: error - ${e.message}`);
    return { found: false, error: 'Network error with id.loc.gov (CORS or connectivity issue)' };
  }
}
