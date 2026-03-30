/**
 * Shared id.loc.gov base URL resolver.
 * Probes preprod first, falls back to public. Cached for the session.
 */

let baseUrl = null;

export async function resolveBaseUrl() {
  if (baseUrl) return baseUrl;

  try {
    const test = await fetch('https://preprod.id.loc.gov/', { signal: AbortSignal.timeout(3000) });
    if (test.status !== 403) {
      baseUrl = 'https://preprod.id.loc.gov';
      console.log('[id.loc.gov] Using preprod.id.loc.gov');
      return baseUrl;
    }
  } catch {
    // preprod not available
  }

  baseUrl = 'https://id.loc.gov';
  console.log('[id.loc.gov] Using id.loc.gov (preprod unavailable)');
  return baseUrl;
}
