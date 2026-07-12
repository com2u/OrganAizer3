import { Appointment, TerminDetail, Bereich, Usergruppe, Intervall, User } from './types'
import { logApi } from './logging'

// Configurable at build time via VITE_API_BASE.
// Defaults to the relative '/api' (frontend served by the Flask backend).
// For the ionos-hosted frontend, set VITE_API_BASE=http://167.235.156.114:4815/api
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

const TOKEN_KEY = 'organaizer_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** fetch wrapper that adds the auth header, logs requests, and reacts to expired sessions. */
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const start = performance.now()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...authHeaders() },
  })
  const duration = performance.now() - start
  logApi(init.method || 'GET', path, res.status, duration)
  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new Event('auth:expired'))
  }
  return res
}

// ===== Authentication =====

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Anmeldung fehlgeschlagen')
  }
  setToken(data.token)
  return data.user as User
}

export async function fetchMe(): Promise<User> {
  const res = await apiFetch('/auth/me')
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

export function logout(): void {
  clearToken()
}

export async function fetchConfig(): Promise<Record<string, unknown>> {
  const res = await apiFetch('/config')
  if (!res.ok) throw new Error('Failed to fetch configuration')
  return res.json()
}

export async function saveConfig(config: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await apiFetch('/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to save configuration')
  }
  return res.json()
}

// ===== Data =====

export async function fetchWeeks(): Promise<number[]> {
  const res = await apiFetch('/weeks')
  if (!res.ok) throw new Error('Failed to fetch weeks')
  return res.json()
}

export async function fetchWeekAppointments(week: number): Promise<Appointment[]> {
  const res = await apiFetch(`/week/${week}`)
  if (!res.ok) throw new Error('Failed to fetch week appointments')
  return res.json()
}

export async function fetchTerminDetail(nr: number): Promise<TerminDetail> {
  const res = await apiFetch(`/termine/${nr}`)
  if (!res.ok) throw new Error('Failed to fetch termin detail')
  return res.json()
}

export async function fetchBereiche(): Promise<Bereich[]> {
  const res = await apiFetch('/bereiche')
  if (!res.ok) throw new Error('Failed to fetch bereiche')
  return res.json()
}

export async function fetchUsergruppen(): Promise<Usergruppe[]> {
  const res = await apiFetch('/usergruppen')
  if (!res.ok) throw new Error('Failed to fetch usergruppen')
  return res.json()
}

export async function fetchIntervalle(): Promise<Intervall[]> {
  const res = await apiFetch('/intervalle')
  if (!res.ok) throw new Error('Failed to fetch intervalle')
  return res.json()
}

export async function importExcel(file: File): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch('/import', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Import failed')
  }
}

export async function exportExcel(): Promise<void> {
  const res = await apiFetch('/export')
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'terminlandschaft.xlsx'
  a.click()
  window.URL.revokeObjectURL(url)
}
