export interface Appointment {
  id: number
  woche: number
  tag: string
  start: string
  bespr_nr: number
  bezeichnung: string
  intervall: string
  dauer_min: number
  teilnehmer: string[]
}

export interface TerminDetail {
  bespr_nr: number
  bezeichnung: string
  intervall: string
  intervall_bedeutung: string
  dauer_min: number
  teilnehmer: {
    usergruppe: string
    bezeichnung: string
    name: string
  }[]
}

export interface Bereich {
  gruppe: string
  bereich: string
}

export interface Usergruppe {
  nummer: string
  bereich: string
  bezeichnung: string
  name: string | null
}

export interface Intervall {
  kuerzel: string
  bedeutung: string
}

export interface User {
  email: string
  name: string | null
  role: string | null
  profile_image_url?: string | null
}

// ===== Telephony =====

// Full telephony configuration managed on the Telefonie page. Secret fields are
// write-only: the backend only reports whether they are set (has_*).
export interface TelephonyConfig {
  enabled: string
  provider: string
  phone_number: string
  // Twilio
  twilio_account_sid: string
  has_twilio_auth_token: boolean
  twilio_sip_uri: string
  twilio_trunk_sid: string
  outbound_trunk_id: string
  // OpenAI
  has_openai_api_key: boolean
  openai_realtime_model: string
  openai_voice: string
  openai_search_model: string
  // LiveKit
  livekit_url: string
  livekit_public_url: string
  livekit_api_key: string
  has_livekit_api_secret: boolean
  web_room_name: string
  // Assistant
  assistant_name: string
  assistant_greeting: string
  assistant_languages: string
  // Knowledge
  knowledge_source: string
  obsidian_vault: string
  config_path_configured: boolean
}

export interface TelephonyStatus {
  enabled: boolean
  phone_number: string
  provider: string
  voice: {
    reachable: boolean
    livekit_ok?: boolean
    active_rooms?: number
    inbound_configured?: boolean
    outbound_configured?: boolean
    error?: string
  }
}

export interface WebToken {
  token: string
  url: string
  room: string
  identity: string
}

export interface Call {
  id: number
  direction: string
  remote_number: string
  status: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  summary: string | null
}

export interface DialogEntry {
  id: number
  call_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  status: string
}

export interface CallDetail extends Call {
  dialog: DialogEntry[]
}

// A phonebook contact (shared with the phone assistant). Notes are appended by
// the assistant after a call and are editable in the Telefonate tab.
export interface PhonebookContact {
  number: string
  name: string
  notes: string[]
}

export interface VoiceResponse {
  reply?: string
  error?: string
  mode?: string
}

// ===== TTS / STT / YouTube / OCR =====

export interface TTSResponse {
  audio_url?: string
  error?: string
  config_required?: string
}

export interface STTResponse {
  text?: string
  error?: string
  config_required?: string
}

export interface YouTubeResponse {
  download_url?: string
  filename?: string
  error?: string
  config_required?: string
}

export interface OCRResponse {
  text?: string
  engine?: string
  error?: string
  config_required?: string
}

export interface HermesExecuteResponse {
  result?: string
  error?: string
  config_required?: string
}

// ===== Resources =====

export interface Person {
  id: number
  vorname: string
  nachname: string
  email: string
  telefon: string
  usergruppe: string | null
  aktiv: number
  erstellt_am: string
  aktualisiert_am: string
  rollen?: Rolle[]
}

export interface Rolle {
  id: number
  bezeichnung: string
  beschreibung: string
  farbe: string
  erstellt_am: string
}

export interface Raum {
  id: number
  bezeichnung: string
  gebaeude: string
  kapazitaet: number
  ausstattung: string
  aktiv: number
  erstellt_am: string
}

export interface Komponente {
  id: number
  bezeichnung: string
  typ: string
  beschreibung: string
  verfuegbar: number
  erstellt_am: string
}

export interface GruppenMitglied {
  nummer: string
  bezeichnung: string
  name: string | null
}

export interface Gruppe {
  gruppe: string
  bereich: string
  mitglieder: GruppenMitglied[]
}

export interface TerminDef {
  bespr_nr: number
  bezeichnung: string
  intervall: string
  dauer_min: number
  intervall_text: string
}

// ===== Planning =====

export type RegelTyp = 'constraint' | 'preference' | 'exclusion' | 'requirement'

export interface Planungsregel {
  id: number
  bezeichnung: string
  typ: RegelTyp
  bedingung: string
  prioritaet: number
  aktiv: number
  erstellt_am: string
  aktualisiert_am: string
}

export interface PlanungsErgebnis {
  provider_status: string
  error?: string
  hinweis?: string
  ai_response?: string
  vorschlaege: Array<Record<string, unknown>>
  konflikte: PlanningIssue[]
  bestehende_termine: number
  regeln_geladen: number
  model?: string
  summary?: string
  excel_ready?: boolean
  phase?: string
  progress_messages?: string[]
}

export interface PlanningIssue {
  severity: 'error' | 'warning' | 'info'
  title: string
  description: string
  related_rules?: number[]
  related_meetings?: number[]
}

export interface OpenRouterModel {
  id: string
  name: string
  description: string
  context_length?: number
  pricing: Record<string, string>
}

export interface SystemStatus {
  cpu_percent: number
  memory_total: number
  memory_used: number
  memory_percent: number
  containers: Array<{ id: string; name: string; image: string; state: string; status: string }>
  docker_error?: string | null
  timestamp: number
}

export interface Planungsauftrag {
  id: number
  bezeichnung: string
  woche_von: number
  woche_bis: number
  status: string
  ergebnis_json: string | null
  ergebnis?: PlanungsErgebnis | null
  regeln?: Planungsregel[]
  erstellt_am: string
  aktualisiert_am: string
}

// ===== Abhängigkeiten =====

export type AbhaengigkeitTyp = 'requires' | 'blocks' | 'conflicts' | 'supports'
export type ZielTyp = 'regel' | 'person' | 'gruppe' | 'rolle' | 'raum' | 'komponente' | 'termin'

export interface Abhaengigkeit {
  id: number
  regel_id: number
  typ: AbhaengigkeitTyp
  ziel_typ: ZielTyp
  ziel_id: number | null
  ziel_text: string | null
  bedingung: string | null
  aktiv: number
  erstellt_am: string
  aktualisiert_am: string
}
