/**
 * Client-side enrich function.
 *
 * Fetches BIBFRAME RDF from id.loc.gov (or preprod) for a list of instance IDs,
 * extracts LC subject headings and LCC classifications, and deduplicates.
 * Processes in batches of 2 to avoid overwhelming the server.
 *
 * Usage:
 *   import { enrich } from './enrich.js';
 *   const result = await enrich(['22442111', '9986313']);
 */

import { resolveBaseUrl } from './idlocgov.js';

const USER_AGENT = 'LC Yoshino';
const BATCH_SIZE = 2;

const NS = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  bf: 'http://id.loc.gov/ontologies/bibframe/',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  madsrdf: 'http://www.loc.gov/mads/rdf/v1#',
  bflc: 'http://id.loc.gov/ontologies/bflc/',
};

function getElementsByTagNS(el, ns, localName) {
  return Array.from(el.getElementsByTagNameNS(ns, localName));
}

function getTextContent(el, ns, localName) {
  const found = el.getElementsByTagNameNS(ns, localName);
  if (found.length > 0 && found[0].textContent) {
    return found[0].textContent.trim();
  }
  return null;
}

/**
 * Fetch the BIBFRAME RDF for a single instance ID.
 */
async function fetchRdf(instanceId, base, retried = false) {
  const url = `${base}/resources/instances/${encodeURIComponent(instanceId)}.cbd.rdf`;
  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/rdf+xml',
        'User-Agent': USER_AGENT,
      },
    });
    if (resp.status === 503 && !retried) {
      console.log(`[enrich] ${instanceId}: 503, retrying...`);
      return fetchRdf(instanceId, base, true);
    }
    if (!resp.ok) return { id: instanceId, xml: null };
    const text = await resp.text();
    return { id: instanceId, xml: text };
  } catch {
    return { id: instanceId, xml: null };
  }
}

/**
 * Parse BIBFRAME RDF XML and extract subjects and classifications.
 */
function parseRdf(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const subjects = [];
  const classifications = [];

  const works = getElementsByTagNS(doc, NS.bf, 'Work');
  if (works.length === 0) return { subjects, classifications };
  const work = works[0];

  // Extract subjects
  for (const subjEl of getElementsByTagNS(work, NS.bf, 'subject')) {
    const labelEls = getElementsByTagNS(subjEl, NS.madsrdf, 'authoritativeLabel');
    if (labelEls.length === 0 || !labelEls[0].textContent) continue;

    // Filter out BISAC headings
    let isBisac = false;
    let sourceName = null;

    const bfSources = getElementsByTagNS(subjEl, NS.bf, 'Source');
    if (bfSources.length > 0) {
      for (const src of bfSources) {
        const about = src.getAttributeNS(NS.rdf, 'about') || '';
        const srcLabel = getTextContent(src, NS.rdfs, 'label') || '';
        if (about.includes('bisacsh') || srcLabel.toLowerCase().includes('bisacsh')) {
          isBisac = true;
          break;
        }
        if (!sourceName && srcLabel) {
          sourceName = srcLabel;
        }
      }
      if (isBisac) continue;
    }

    const label = labelEls[0].textContent.trim();
    const serializer = new XMLSerializer();
    const xml = serializer.serializeToString(subjEl);

    subjects.push({
      label,
      xml,
      source: sourceName || 'Library of Congress Subject Headings',
    });
  }

  // Extract classifications (LCC only)
  for (const classEl of getElementsByTagNS(work, NS.bf, 'classification')) {
    const lccEls = getElementsByTagNS(classEl, NS.bf, 'ClassificationLcc');
    if (lccEls.length === 0) continue;

    const portionEl = getElementsByTagNS(lccEls[0], NS.bf, 'classificationPortion');
    if (portionEl.length === 0 || !portionEl[0].textContent) continue;

    const portion = portionEl[0].textContent.trim();
    const serializer = new XMLSerializer();
    const xml = serializer.serializeToString(classEl);

    classifications.push({ portion, xml });
  }

  return { subjects, classifications };
}

/**
 * Process an array in batches, running fn on each batch concurrently.
 */
async function processBatches(items, batchSize, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Enrich a list of id.loc.gov instance IDs.
 *
 * Fetches RDF in batches, parses subjects and classifications,
 * and deduplicates across all IDs.
 *
 * @param {string[]} ids - List of instance IDs
 * @param {function} [onProgress] - Optional callback(id, result) called after each ID resolves
 * @returns {Promise<Object>} Result with per-ID breakdown and deduplicated unique lists
 */
export async function enrich(ids, onProgress) {
  const base = await resolveBaseUrl();

  console.log(`[enrich] Starting enrichment for ${ids.length} IDs in batches of ${BATCH_SIZE}`);

  const rdfResults = await processBatches(ids, BATCH_SIZE, id => fetchRdf(id, base));

  const results = {};
  const errors = {};
  const seenSubjects = new Map();
  const seenClassifications = new Map();

  for (const { id, xml } of rdfResults) {
    if (!xml) {
      errors[id] = 'Failed to fetch RDF';
      results[id] = { subjects: [], classifications: [] };
      console.log(`[enrich] ${id}: error (timeout/fetch failed)`);
      if (onProgress) onProgress(id, { subjects: [], classifications: [], error: true });
      continue;
    }

    try {
      const parsed = parseRdf(xml);

      results[id] = {
        subjects: parsed.subjects.map(s => s.label),
        classifications: parsed.classifications.map(c => c.portion),
      };

      console.log(`[enrich] ${id}: ${parsed.subjects.length} subjects, ${parsed.classifications.length} classifications`);

      for (const s of parsed.subjects) {
        if (!seenSubjects.has(s.label)) {
          seenSubjects.set(s.label, { xml: s.xml, source: s.source });
        }
      }

      for (const c of parsed.classifications) {
        if (!seenClassifications.has(c.portion)) {
          seenClassifications.set(c.portion, c.xml);
        }
      }

      if (onProgress) onProgress(id, results[id]);
    } catch (e) {
      errors[id] = `Failed to parse RDF: ${e.message}`;
      results[id] = { subjects: [], classifications: [] };
      console.log(`[enrich] ${id}: parse error - ${e.message}`);
      if (onProgress) onProgress(id, { subjects: [], classifications: [], error: true });
    }
  }

  const uniqueSubjects = Array.from(seenSubjects.entries()).map(
    ([label, info]) => ({ label, xml: info.xml, source: info.source })
  );

  const uniqueClassifications = Array.from(seenClassifications.entries()).map(
    ([portion, xml]) => ({ portion, xml })
  );

  const result = {
    results,
    unique_subjects: uniqueSubjects,
    unique_classifications: uniqueClassifications,
  };

  if (Object.keys(errors).length > 0) {
    result.errors = errors;
  }

  console.log(`[enrich] Complete: ${uniqueSubjects.length} unique subjects, ${uniqueClassifications.length} unique classifications, ${Object.keys(errors).length} errors`);

  return result;
}
