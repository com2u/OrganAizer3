import { Appointment, TerminDetail, Bereich, Usergruppe, Intervall, User, TelephonyConfig, TelephonyStatus, WebToken, Call, CallDetail, PhonebookContact, VoiceResponse, TTSResponse, STTResponse, YouTubeResponse, OCRResponse, HermesExecuteResponse, Person, Rolle, Raum, Komponente, Gruppe, GruppenMitglied, TerminDef, Planungsregel, Planungsauftrag, Abhaengigkeit, OpenRouterModel, PlanningIssue, SystemStatus } from './types'
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

export interface ResearchNotebook {
  id: string
  name: string
  description?: string
  created?: string
  updated?: string
}

export interface OpenNotebookStatus {
  available: boolean
  public_url: string
  service?: Record<string, unknown>
}

export async function fetchOpenNotebookStatus(): Promise<OpenNotebookStatus> {
  const res = await apiFetch('/open-notebook/status')
  if (!res.ok) throw new Error('Open Notebook status could not be loaded')
  return res.json()
}

export async function fetchOpenNotebookAccess(): Promise<{ configured: boolean; password: string }> {
  const res = await apiFetch('/open-notebook/access')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Open Notebook access could not be loaded')
  return data
}

export async function fetchResearchNotebooks(): Promise<ResearchNotebook[]> {
  const res = await apiFetch('/open-notebook/notebooks')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Research notebooks could not be loaded')
  return Array.isArray(data) ? data : (data.notebooks || [])
}

export async function createResearchNotebook(name: string, description: string): Promise<ResearchNotebook> {
  const res = await apiFetch('/open-notebook/notebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Research notebook could not be created')
  return data
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

export interface ImportIssue {
  severity: 'error' | 'warning'
  sheet: string
  row?: number
  message: string
}

export async function validateExcelImport(file: File): Promise<{ valid: boolean; issues: ImportIssue[] }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch('/import/validate', { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Import validation failed')
  return data
}

export async function importExcel(file: File, confirmInvalid = false): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('confirm_overwrite', 'true')
  formData.append('confirm_invalid', confirmInvalid ? 'true' : 'false')
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

// ===== Telephony =====

export async function fetchTelephonyConfig(): Promise<TelephonyConfig> {
  const res = await apiFetch('/telephony/config')
  if (!res.ok) throw new Error('Failed to fetch telephony config')
  return res.json()
}

export async function saveTelephonyConfig(config: Record<string, unknown>): Promise<TelephonyConfig> {
  const res = await apiFetch('/telephony/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to save telephony config')
  }
  return res.json()
}

export async function fetchTelephonyStatus(): Promise<TelephonyStatus> {
  const res = await apiFetch('/telephony/status')
  if (!res.ok) throw new Error('Failed to fetch telephony status')
  return res.json()
}

export async function fetchWebToken(): Promise<WebToken> {
  const res = await apiFetch('/telephony/web-token')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed to obtain web token')
  return data
}

export async function fetchCalls(): Promise<Call[]> {
  const res = await apiFetch('/telephony/calls')
  if (!res.ok) throw new Error('Failed to fetch calls')
  return res.json()
}

export async function fetchCallDetail(callId: number): Promise<CallDetail> {
  const res = await apiFetch(`/telephony/calls/${callId}`)
  if (!res.ok) throw new Error('Failed to fetch call detail')
  return res.json()
}

export async function startCall(remoteNumber: string, direction = 'outbound'): Promise<CallDetail> {
  const res = await apiFetch('/telephony/calls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remote_number: remoteNumber, direction }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to start call')
  }
  return res.json()
}

export async function endCall(callId: number): Promise<Call> {
  const res = await apiFetch(`/telephony/calls/${callId}/end`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to end call')
  return res.json()
}

export async function deleteCall(callId: number): Promise<void> {
  const res = await apiFetch(`/telephony/calls/${callId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete call')
}

export async function sendVoiceMessage(message: string, callId?: number): Promise<VoiceResponse> {
  const res = await apiFetch('/telephony/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, call_id: callId }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Voice message failed')
  }
  return data
}

export async function fetchPhonebook(): Promise<PhonebookContact[]> {
  const res = await apiFetch('/telephony/phonebook')
  if (!res.ok) throw new Error('Failed to fetch phonebook')
  return res.json()
}

export async function savePhonebookContact(
  contact: { number: string; name: string; email: string; notes: string[]; original_number?: string }
): Promise<PhonebookContact> {
  const res = await apiFetch('/telephony/phonebook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed to save contact')
  return data
}

export async function deletePhonebookContact(number: string): Promise<void> {
  const res = await apiFetch(`/telephony/phonebook/${encodeURIComponent(number)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to delete contact')
  }
}

// ===== TTS / STT / YouTube / OCR / Hermes =====

export async function generateTTS(text: string, voice: string, speed: string): Promise<TTSResponse> {
  const res = await apiFetch('/tts/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, speed }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'TTS fehlgeschlagen / TTS failed')
  return data
}

/** Load a protected TTS audio file with the current session credentials. */
export async function fetchTTSAudio(path: string): Promise<Blob> {
  const cleanPath = path.replace(/^\/api/, '')
  const res = await apiFetch(cleanPath)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Audiodatei konnte nicht geladen werden / Audio could not be loaded')
  }
  return res.blob()
}

export async function transcribeAudio(file: File, language = 'de'): Promise<STTResponse> {
  const formData = new FormData()
  formData.append('audio', file)
  formData.append('language', language)
  const res = await apiFetch('/stt/transcribe', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'STT fehlgeschlagen / STT failed')
  return data
}

export async function transcribeBlob(blob: Blob, language = 'de'): Promise<STTResponse> {
  const formData = new FormData()
  formData.append('audio', blob, 'recording.webm')
  formData.append('language', language)
  const res = await apiFetch('/stt/transcribe', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'STT fehlgeschlagen / STT failed')
  return data
}

export async function downloadYouTube(url: string, format: 'audio' | 'video'): Promise<YouTubeResponse> {
  const res = await apiFetch('/youtube/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'YouTube-Download fehlgeschlagen / YouTube download failed')
  return data
}

export async function extractOCR(file: File, language = 'de'): Promise<OCRResponse> {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('language', language)
  const res = await apiFetch('/ocr/extract', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'OCR fehlgeschlagen / OCR failed')
  return data
}

export async function hermesExecute(prompt: string): Promise<HermesExecuteResponse> {
  const res = await apiFetch('/hermes/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Ausführung fehlgeschlagen / Execution failed')
  return data
}

// ===== Resources =====

async function _resourceCrud<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`/resources${base}${path}`, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data as T
}

export const fetchPersonen = (q = '') => _resourceCrud<Person[]>('/personen', q ? `?q=${encodeURIComponent(q)}` : '')
export const fetchPerson = (id: number) => _resourceCrud<Person>('/personen', `/${id}`)
export const createPerson = (p: Partial<Person>) => _resourceCrud<Person>('/personen', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
export const updatePerson = (id: number, p: Partial<Person>) => _resourceCrud<Person>('/personen', `/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
export const deletePerson = (id: number) => _resourceCrud<{ status: string }>('/personen', `/${id}`, { method: 'DELETE' })

export const fetchRollen = () => _resourceCrud<Rolle[]>('/rollen', '')
export const createRolle = (r: Partial<Rolle>) => _resourceCrud<Rolle>('/rollen', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
export const updateRolle = (id: number, r: Partial<Rolle>) => _resourceCrud<Rolle>('/rollen', `/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
export const deleteRolle = (id: number) => _resourceCrud<{ status: string }>('/rollen', `/${id}`, { method: 'DELETE' })

export const fetchRaeume = (q = '') => _resourceCrud<Raum[]>('/raeume', q ? `?q=${encodeURIComponent(q)}` : '')
export const fetchRaum = (id: number) => _resourceCrud<Raum>('/raeume', `/${id}`)
export const createRaum = (r: Partial<Raum>) => _resourceCrud<Raum>('/raeume', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
export const updateRaum = (id: number, r: Partial<Raum>) => _resourceCrud<Raum>('/raeume', `/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
export const deleteRaum = (id: number) => _resourceCrud<{ status: string }>('/raeume', `/${id}`, { method: 'DELETE' })

export const fetchKomponenten = (q = '') => _resourceCrud<Komponente[]>('/komponenten', q ? `?q=${encodeURIComponent(q)}` : '')
export const createKomponente = (k: Partial<Komponente>) => _resourceCrud<Komponente>('/komponenten', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(k) })
export const updateKomponente = (id: number, k: Partial<Komponente>) => _resourceCrud<Komponente>('/komponenten', `/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(k) })
export const deleteKomponente = (id: number) => _resourceCrud<{ status: string }>('/komponenten', `/${id}`, { method: 'DELETE' })

export const fetchGruppen = () => _resourceCrud<Gruppe[]>('/gruppen', '')
export const createGruppe = (g: { gruppe: string; bereich: string }) => _resourceCrud<Gruppe>('/gruppen', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(g) })
export const updateGruppe = (gruppe: string, g: { bereich: string }) => _resourceCrud<Gruppe>('/gruppen', `/${encodeURIComponent(gruppe)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(g) })
export const deleteGruppe = (gruppe: string) => _resourceCrud<{ status: string }>('/gruppen', `/${encodeURIComponent(gruppe)}`, { method: 'DELETE' })
export const createMitglied = (gruppe: string, m: { nummer: string; bezeichnung: string; name?: string }) => _resourceCrud<GruppenMitglied>('/gruppen', `/${encodeURIComponent(gruppe)}/mitglieder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) })
export const updateMitglied = (nummer: string, m: { bezeichnung: string; name?: string }) => _resourceCrud<GruppenMitglied>('/mitglieder', `/${encodeURIComponent(nummer)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) })
export const deleteMitglied = (nummer: string) => _resourceCrud<{ status: string }>('/mitglieder', `/${encodeURIComponent(nummer)}`, { method: 'DELETE' })

export const fetchResourceTermine = () => _resourceCrud<TerminDef[]>('/termine', '')
export const createTermin = (tr: { bezeichnung: string; intervall: string; dauer_min: number; bespr_nr?: number; teilnehmer?: string[]; raum_ids?: number[]; komponenten_ids?: number[] }) => _resourceCrud<TerminDef>('/termine', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tr) })
export const updateTermin = (nr: number, tr: { bezeichnung: string; intervall: string; dauer_min: number; teilnehmer?: string[]; raum_ids?: number[]; komponenten_ids?: number[] }) => _resourceCrud<TerminDef>('/termine', `/${nr}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tr) })
export const deleteTermin = (nr: number) => _resourceCrud<{ status: string }>('/termine', `/${nr}`, { method: 'DELETE' })

// ===== Planning =====

export const fetchRegeln = () => _resourceCrud<Planungsregel[]>('', '', { ...({ _base: '/planning/regeln' } as any) })
  // Override: planning uses different base
export async function fetchPlanungsregeln(): Promise<Planungsregel[]> {
  const res = await apiFetch('/planning/regeln')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch rules')
  return data
}

export async function createPlanungsregel(r: Partial<Planungsregel>): Promise<Planungsregel> {
  const res = await apiFetch('/planning/regeln', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create rule')
  return data
}

export async function updatePlanungsregel(id: number, r: Partial<Planungsregel>): Promise<Planungsregel> {
  const res = await apiFetch(`/planning/regeln/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update rule')
  return data
}

export async function deletePlanungsregel(id: number): Promise<void> {
  const res = await apiFetch(`/planning/regeln/${id}`, { method: 'DELETE' })
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to delete rule') }
}

export async function fetchPlanungsauftraege(): Promise<Planungsauftrag[]> {
  const res = await apiFetch('/planning/auftraege')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch planning jobs')
  return data
}

export async function fetchPlanungsauftrag(id: number): Promise<Planungsauftrag> {
  const res = await apiFetch(`/planning/auftraege/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch planning job')
  return data
}

export async function createPlanungsauftrag(body: { bezeichnung?: string; woche_von: number; woche_bis: number; regel_ids?: number[]; run_ai?: boolean; model?: string }): Promise<Planungsauftrag> {
  const res = await apiFetch('/planning/auftraege', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create planning job')
  return data
}

export async function runPlanungsauftrag(id: number, model?: string): Promise<Planungsauftrag> {
  const res = await apiFetch(`/planning/auftraege/${id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to run planning')
  return data
}

export async function fetchOpenRouterModels(): Promise<{ models: OpenRouterModel[]; default: string }> {
  const res = await apiFetch('/planning/models')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'OpenRouter models could not be loaded')
  return data
}

export async function validatePlanning(body: { woche_von: number; woche_bis: number; regel_ids: number[]; model: string }): Promise<{ valid: boolean; summary: string; issues: PlanningIssue[]; model: string }> {
  const res = await apiFetch('/planning/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Validation failed')
  return data
}

export async function downloadPlanningExcel(id: number): Promise<void> {
  const res = await apiFetch(`/planning/auftraege/${id}/excel`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Planning Excel download failed')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `planung-${id}.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await apiFetch('/system/status')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'System status unavailable')
  return data
}

export async function applyPlanungsauftrag(id: number): Promise<{ status: string; applied: number }> {
  const res = await apiFetch(`/planning/auftraege/${id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to apply planning')
  return data
}

// ===== Abhängigkeiten =====

export async function fetchAbhaengigkeiten(regelId?: number): Promise<Abhaengigkeit[]> {
  const q = regelId ? `?regel_id=${regelId}` : ''
  const res = await apiFetch(`/planning/abhaengigkeiten${q}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch dependencies')
  return data
}

export async function createAbhaengigkeit(a: Partial<Abhaengigkeit>): Promise<Abhaengigkeit> {
  const res = await apiFetch('/planning/abhaengigkeiten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create dependency')
  return data
}

export async function updateAbhaengigkeit(id: number, a: Partial<Abhaengigkeit>): Promise<Abhaengigkeit> {
  const res = await apiFetch(`/planning/abhaengigkeiten/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update dependency')
  return data
}

export async function deleteAbhaengigkeit(id: number): Promise<void> {
  const res = await apiFetch(`/planning/abhaengigkeiten/${id}`, { method: 'DELETE' })
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to delete dependency') }
}

// ===== AI Connections =====

export interface AIConnection {
  id: number
  name: string
  provider: string
  kategorie: string
  model_name: string | null
  base_url: string | null
  region: string | null
  endpoint: string | null
  secret_configured: boolean
  aktiv: number
  metadata_json: string | null
  erstellt_am: string
  aktualisiert_am: string
}

export interface AIConnectionInput {
  name: string
  provider: string
  kategorie?: string
  model_name?: string
  base_url?: string
  region?: string
  endpoint?: string
  secret_ref?: string
  aktiv?: boolean
  metadata_json?: string | Record<string, unknown>
}

export interface AITestResult {
  status: string
  message: string
}

export async function fetchAIConnections(): Promise<AIConnection[]> {
  const res = await apiFetch('/ai-connections')
  if (!res.ok) throw new Error('Failed to fetch AI connections')
  return res.json()
}

export async function fetchAIConnection(id: number): Promise<AIConnection> {
  const res = await apiFetch(`/ai-connections/${id}`)
  if (!res.ok) throw new Error('Failed to fetch AI connection')
  return res.json()
}

export async function createAIConnection(data: AIConnectionInput): Promise<AIConnection> {
  const res = await apiFetch('/ai-connections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(d.error || 'Failed to create AI connection')
  return d
}

export async function updateAIConnection(id: number, data: AIConnectionInput): Promise<AIConnection> {
  const res = await apiFetch(`/ai-connections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(d.error || 'Failed to update AI connection')
  return d
}

export async function deleteAIConnection(id: number): Promise<void> {
  const res = await apiFetch(`/ai-connections/${id}`, { method: 'DELETE' })
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to delete') }
}

export async function testAIConnection(id: number): Promise<AITestResult> {
  const res = await apiFetch(`/ai-connections/${id}/test`, { method: 'POST' })
  const d = await res.json()
  if (!res.ok) throw new Error(d.error || 'Test failed')
  return d
}

// ===== Obsidian / Wissen =====

export interface ObsidianFileNode {
  type: 'file'
  name: string
  path: string
  mtime: number
  created: number
  size: number
}

export interface ObsidianDirNode {
  type: 'directory'
  name: string
  path: string
  children: ObsidianTreeNode[]
}

export type ObsidianTreeNode = ObsidianFileNode | ObsidianDirNode

export interface ObsidianSearchResult {
  path: string
  title: string
  snippet: string
  line: number
  tags: string[]
  mtime: number
  created: number
  match_type: 'fulltext' | 'heading'
  match_count?: number
}

export interface ObsidianTag {
  tag: string
  count: number
  files: string[]
}

export interface ObsidianNote {
  path: string
  name: string
  mtime: number
  created: number
  size: number
}

export interface ObsidianNoteContent {
  path: string
  content: string
  size: number
  mtime: number
  created: number
}

export async function fetchObsidianTree(): Promise<{ tree: ObsidianDirNode; vault_missing?: boolean }> {
  const res = await apiFetch('/obsidian/tree')
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to load tree') }
  return res.json()
}

export async function searchObsidian(q: string, mode: 'fulltext' | 'headings' = 'fulltext', limit = 50): Promise<{ results: ObsidianSearchResult[]; total: number }> {
  const params = new URLSearchParams({ q, mode, limit: String(limit) })
  const res = await apiFetch(`/obsidian/search?${params}`)
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Search failed') }
  return res.json()
}

export async function fetchObsidianTags(q = ''): Promise<{ tags: ObsidianTag[] }> {
  const params = q ? new URLSearchParams({ q }) : new URLSearchParams()
  const res = await apiFetch(`/obsidian/tags${q ? '?' + params : ''}`)
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to load tags') }
  return res.json()
}

export async function fetchObsidianRecent(sort: 'modified' | 'created' = 'modified', order: 'desc' | 'asc' = 'desc', limit = 50): Promise<{ notes: ObsidianNote[] }> {
  const params = new URLSearchParams({ sort, order, limit: String(limit) })
  const res = await apiFetch(`/obsidian/recent?${params}`)
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to load recent notes') }
  return res.json()
}

export async function fetchObsidianNote(path: string): Promise<ObsidianNoteContent> {
  const params = new URLSearchParams({ path })
  const res = await apiFetch(`/obsidian/note?${params}`)
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to load note') }
  return res.json()
}

export async function saveObsidianNote(path: string, content: string, expected_mtime?: number): Promise<{ path: string; mtime: number; created: number; size: number }> {
  const body: Record<string, unknown> = { path, content }
  if (expected_mtime !== undefined) body.expected_mtime = expected_mtime
  const res = await apiFetch('/obsidian/note', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const d = await res.json().catch(() => ({}))
  if (res.status === 409) throw Object.assign(new Error(d.error || 'Conflict'), { conflict: true, current_mtime: d.current_mtime })
  if (!res.ok) throw new Error(d.error || 'Failed to save note')
  return d
}

// ===== Verbindungen (Integration Connections) =====

export interface Verbindung {
  id: number
  template_key: string
  name: string
  status: string
  beschreibung?: string | null
  erstellt_am?: string | null
  aktualisiert_am?: string | null
}

export interface VerbindungInput {
  template_key: string
  name: string
  beschreibung?: string
}

export async function fetchVerbindungen(): Promise<Verbindung[]> {
  const res = await apiFetch('/verbindungen')
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to load connections') }
  return res.json()
}

export async function createVerbindung(input: VerbindungInput): Promise<Verbindung> {
  const res = await apiFetch('/verbindungen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(d.error || 'Failed to create connection')
  return d
}

export async function deleteVerbindung(id: number): Promise<void> {
  const res = await apiFetch(`/verbindungen/${id}`, { method: 'DELETE' })
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to delete connection') }
}

export type IntegrationKey = 'open_notebook' | 'slidev' | 'hyperframes' | 'excalidraw'
export interface IntegrationCapability {
  added: boolean
  configured: boolean
  public_url: string
}
export type IntegrationCapabilities = Record<'open_notebook' | 'slidev' | 'hyperframes' | 'excalidraw' | 'n8n', IntegrationCapability>

export async function fetchIntegrationCapabilities(): Promise<IntegrationCapabilities> {
  const res = await apiFetch('/verbindungen/capabilities')
  if (!res.ok) throw new Error('Integrationen konnten nicht geladen werden')
  return res.json()
}

export async function fetchIntegrationConfig(key: IntegrationKey): Promise<Record<string, string | boolean>> {
  const res = await apiFetch(`/verbindungen/integrations/${key}`)
  if (!res.ok) throw new Error('Konfiguration konnte nicht geladen werden')
  return res.json()
}

export async function saveIntegrationConfig(key: IntegrationKey, config: Record<string, string | boolean>): Promise<Record<string, string | boolean>> {
  const res = await apiFetch(`/verbindungen/integrations/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Konfiguration konnte nicht gespeichert werden')
  return data
}

export async function fetchSlidevProject(): Promise<{ content: string }> {
  const res = await apiFetch('/slidev/project')
  if (!res.ok) throw new Error('Slidev-Projekt konnte nicht geladen werden')
  return res.json()
}

export async function saveSlidevProject(content: string): Promise<void> {
  const res = await apiFetch('/slidev/project', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Slidev-Projekt konnte nicht gespeichert werden')
  }
}

export interface SlidevFileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  children?: SlidevFileNode[]
}

export interface SlidevProject {
  name: string
  active: boolean
  tree: SlidevFileNode
}

export async function fetchSlidevProjects(): Promise<{ active: string; projects: SlidevProject[] }> {
  const res = await apiFetch('/slidev/projects')
  if (!res.ok) throw new Error('Präsentationen konnten nicht geladen werden')
  return res.json()
}

export async function createSlidevProject(name: string): Promise<void> {
  const res = await apiFetch('/slidev/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Präsentation konnte nicht erstellt werden')
}

export async function deleteSlidevProject(name: string): Promise<void> {
  const res = await apiFetch(`/slidev/projects/${encodeURIComponent(name)}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Präsentation konnte nicht gelöscht werden')
}

export async function activateSlidevProject(name: string): Promise<void> {
  const res = await apiFetch(`/slidev/projects/${encodeURIComponent(name)}/activate`, { method: 'PUT' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Präsentation konnte nicht aktiviert werden')
}

export async function fetchSlidevProjectContent(name: string): Promise<{ content: string }> {
  const res = await apiFetch(`/slidev/projects/${encodeURIComponent(name)}/content`)
  if (!res.ok) throw new Error('Präsentation konnte nicht geladen werden')
  return res.json()
}

export async function saveSlidevProjectContent(name: string, content: string): Promise<void> {
  const res = await apiFetch(`/slidev/projects/${encodeURIComponent(name)}/content`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Präsentation konnte nicht gespeichert werden')
}

export async function createSlidevFolder(project: string, parent: string, name: string): Promise<void> {
  const res = await apiFetch(`/slidev/projects/${encodeURIComponent(project)}/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent, name }) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ordner konnte nicht erstellt werden')
}

export async function uploadSlidevFile(project: string, parent: string, file: File): Promise<void> {
  const form = new FormData()
  form.append('parent', parent)
  form.append('file', file)
  const res = await apiFetch(`/slidev/projects/${encodeURIComponent(project)}/files`, { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Datei konnte nicht hochgeladen werden')
}

export async function deleteSlidevFile(project: string, path: string): Promise<void> {
  const res = await apiFetch(`/slidev/projects/${encodeURIComponent(project)}/files/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Datei konnte nicht gelöscht werden')
}

export async function fetchWorkspaceTicket(target: 'slidev' | 'hyperframes' | 'excalidraw'): Promise<string> {
  const res = await apiFetch(`/workspace-auth/ticket/${target}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Workspace-Zugang konnte nicht erstellt werden')
  return data.ticket
}

export async function fetchHyperframesStatus(): Promise<{ available: boolean; version: string }> {
  const res = await apiFetch('/hyperframes/status')
  if (!res.ok) throw new Error('HyperFrames-Status konnte nicht geladen werden')
  return res.json()
}

export async function fetchExcalidrawStatus(): Promise<{ available: boolean; storage: string }> {
  const res = await apiFetch('/excalidraw/status')
  if (!res.ok) throw new Error('Excalidraw-Status konnte nicht geladen werden')
  return res.json()
}

// ===== n8n Integration =====

export interface N8nConfig {
  id: number
  base_url: string
  api_key_configured: boolean
  webhook_url: string | null
  aktiv: number
  erstellt_am: string
  aktualisiert_am: string
}

export interface N8nConfigInput {
  base_url: string
  api_key?: string
  webhook_url?: string
  aktiv?: boolean
}

export interface N8nTestResult {
  status: string
  message: string
}

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  tags: string[]
}

export async function fetchN8nConfig(): Promise<N8nConfig> {
  const res = await apiFetch('/n8n/config')
  if (!res.ok) throw new Error('Failed to fetch n8n config')
  return res.json()
}

export async function updateN8nConfig(data: N8nConfigInput): Promise<N8nConfig> {
  const res = await apiFetch('/n8n/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(d.error || 'Failed to update n8n config')
  return d
}

export async function testN8nConnection(): Promise<N8nTestResult> {
  const res = await apiFetch('/n8n/test', { method: 'POST' })
  const d = await res.json()
  if (!res.ok) throw new Error(d.error || 'n8n test failed')
  return d
}

export async function fetchN8nWorkflows(): Promise<{ workflows: N8nWorkflow[] }> {
  const res = await apiFetch('/n8n/workflows')
  const d = await res.json()
  if (!res.ok) throw new Error(d.error || 'Failed to fetch workflows')
  return d
}

// ===== Access Requests (public – no auth required) =====

export interface AccessRequestResult {
  request_id: number
  status: string
}

/** Submit an access request through the central API wrapper.
 * The backend route is public, so an auth token is optional.
 */
export async function submitAccessRequest(
  email: string,
  zusatzinfos: string,
): Promise<AccessRequestResult> {
  const res = await apiFetch('/access-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, zusatzinfos }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}
