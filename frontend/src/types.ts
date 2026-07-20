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

export type SipMode = 'disabled' | 'demo' | 'webhook' | 'sipjs'

export interface SipConfig {
  mode: SipMode
  sip_server: string
  sip_port: number
  sip_username: string
  sip_transport: string
  stun_server: string
  webhook_url: string
  has_password: boolean
  updated_at: string | null
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

export interface VoiceResponse {
  reply?: string
  error?: string
  mode: string
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

export interface Gruppe {
  gruppe: string
  bereich: string
  mitglieder: { nummer: string; bezeichnung: string; name: string | null }[]
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
  konflikte: Array<Record<string, unknown>>
  bestehende_termine: number
  regeln_geladen: number
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
