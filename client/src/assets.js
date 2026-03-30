const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export function asset(path) {
  return `${BASE}${path}`
}
