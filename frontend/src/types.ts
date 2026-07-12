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
