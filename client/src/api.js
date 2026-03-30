const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export async function apiCall(action, params = {}) {
  const res = await fetch(`${BASE}/api/search?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function submitRating(data) {
  const res = await fetch(`${BASE}/api/ratings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function fetchRatings(query) {
  const params = query ? `?query=${encodeURIComponent(query)}` : '?limit=50'
  const res = await fetch(`${BASE}/api/ratings${params}`)
  return res.json()
}
