import { auth } from './auth.js'

const API_BASE = '/api'

export async function apiFetch(path, options = {}) {
  const token = auth.getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })

  if (res.status === 401) {
    auth.login()
    return
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`)
  }

  return data
}
