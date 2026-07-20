import { useEffect, useState, useRef } from 'react'
import { useTheme } from '../ThemeContext'
import {
  Phone, PhoneOff, Settings, MessageSquare, List,
  Send, AlertTriangle, CheckCircle, Info, Loader2, Activity,
  BookUser, Trash2, Plus, Save, X
} from 'lucide-react'
import {
  fetchTelephonyConfig, saveTelephonyConfig, fetchTelephonyStatus,
  fetchCalls, fetchCallDetail, startCall, endCall, sendVoiceMessage,
  fetchPhonebook, savePhonebookContact, deletePhonebookContact
} from '../api'
import type { TelephonyConfig, TelephonyStatus, Call, CallDetail, DialogEntry, PhonebookContact } from '../types'

type Tab = 'voice' | 'history' | 'config'

export default function TelefonieView() {
  const { t } = useTheme()
  const [tab, setTab] = useState<Tab>('voice')

  return (
    <section className="view telefonie-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">{t('telefonie.eyebrow')}</span>
          <h1>{t('telefonie.title')}</h1>
          <p className="subtitle">{t('telefonie.sub')}</p>
        </div>
      </header>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'voice' ? 'active' : ''}`} onClick={() => setTab('voice')}>
          <MessageSquare size={16} /> {t('telefonie.tab.voice')}
        </button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <List size={16} /> {t('telefonie.tab.history')}
        </button>
        <button className={`tab-btn ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>
          <Settings size={16} /> {t('telefonie.tab.config')}
        </button>
      </div>

      {tab === 'voice' && <VoiceAssistant t={t} />}
      {tab === 'history' && <CallHistory t={t} />}
      {tab === 'config' && <GatewayConfig t={t} />}
    </section>
  )
}

// ===== Gateway / Telephony Configuration Tab =====

function GatewayConfig({ t }: { t: (k: string) => string }) {
  const [config, setConfig] = useState<TelephonyConfig | null>(null)
  const [status, setStatus] = useState<TelephonyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  // Secret fields: only sent when the user types a new value.
  const [secrets, setSecrets] = useState<{ openai: string; twilio: string; livekit: string }>({
    openai: '', twilio: '', livekit: '',
  })

  useEffect(() => {
    fetchTelephonyConfig()
      .then(setConfig)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    fetchTelephonyStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  const set = (key: keyof TelephonyConfig, value: string) =>
    setConfig((c) => (c ? { ...c, [key]: value } : c))

  const handleSave = async () => {
    if (!config) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const payload: Record<string, unknown> = { ...config }
      // Drop read-only / has_* flags before sending.
      delete payload.has_openai_api_key
      delete payload.has_twilio_auth_token
      delete payload.has_livekit_api_secret
      delete payload.config_path_configured
      // Only include secrets the user actually entered.
      if (secrets.openai) payload.openai_api_key = secrets.openai
      if (secrets.twilio) payload.twilio_auth_token = secrets.twilio
      if (secrets.livekit) payload.livekit_api_secret = secrets.livekit
      const updated = await saveTelephonyConfig(payload)
      setConfig(updated)
      setSecrets({ openai: '', twilio: '', livekit: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      fetchTelephonyStatus().then(setStatus).catch(() => {})
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="empty-state"><Loader2 size={24} className="spin" /> {t('loading')}</div>
  if (!config) return <div className="empty-state">{error || t('telefonie.configError')}</div>

  const enabled = config.enabled === 'true'

  return (
    <div className="telefonie-config">
      {error && <div className="telefonie-alert error"><AlertTriangle size={16} /> {error}</div>}
      {saved && <div className="telefonie-alert success"><CheckCircle size={16} /> {t('config.saved')}</div>}

      {status && (
        <div className={`telefonie-alert ${status.voice.reachable && status.voice.livekit_ok ? 'success' : 'info'}`}>
          <Activity size={16} />
          <span>
            {status.voice.reachable
              ? (status.voice.livekit_ok
                  ? t('telefonie.status.online')
                  : t('telefonie.status.degraded'))
              : t('telefonie.status.offline')}
            {status.voice.inbound_configured ? ` · ${t('telefonie.status.inbound')}` : ''}
            {status.voice.outbound_configured ? ` · ${t('telefonie.status.outbound')}` : ''}
          </span>
        </div>
      )}

      <div className="telefonie-alert info">
        <Info size={16} /> {t('telefonie.secretsNotice')}
      </div>

      {/* --- General --- */}
      <h3 className="config-section-title">{t('telefonie.section.general')}</h3>
      <div className="form-group">
        <label className="checkbox-row">
          <input type="checkbox" checked={enabled}
            onChange={(e) => set('enabled', e.target.checked ? 'true' : 'false')} />
          {t('telefonie.enabled')}
        </label>
      </div>
      <div className="form-group">
        <label>{t('telefonie.phoneNumber')}</label>
        <input className="form-field" value={config.phone_number}
          onChange={(e) => set('phone_number', e.target.value)} placeholder="+49 89 62084848" />
      </div>

      {/* --- Twilio --- */}
      <h3 className="config-section-title">{t('telefonie.section.twilio')}</h3>
      <div className="form-group">
        <label>{t('telefonie.twilioAccountSid')}</label>
        <input className="form-field" value={config.twilio_account_sid}
          onChange={(e) => set('twilio_account_sid', e.target.value)} placeholder="ACxxxxxxxx" />
      </div>
      <SecretField
        label={t('telefonie.twilioAuthToken')} isSet={config.has_twilio_auth_token} t={t}
        value={secrets.twilio} onChange={(v) => setSecrets((s) => ({ ...s, twilio: v }))} />
      <div className="form-group">
        <label>{t('telefonie.twilioSipUri')}</label>
        <input className="form-field" value={config.twilio_sip_uri}
          onChange={(e) => set('twilio_sip_uri', e.target.value)} placeholder="sip:your-domain:5060" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t('telefonie.twilioTrunkSid')}</label>
          <input className="form-field" value={config.twilio_trunk_sid}
            onChange={(e) => set('twilio_trunk_sid', e.target.value)} placeholder="TKxxxxxxxx" />
        </div>
        <div className="form-group">
          <label>{t('telefonie.outboundTrunkId')}</label>
          <input className="form-field" value={config.outbound_trunk_id}
            onChange={(e) => set('outbound_trunk_id', e.target.value)} placeholder="ST_xxxxxxxx" />
        </div>
      </div>

      {/* --- OpenAI --- */}
      <h3 className="config-section-title">{t('telefonie.section.openai')}</h3>
      <SecretField
        label={t('telefonie.openaiApiKey')} isSet={config.has_openai_api_key} t={t}
        value={secrets.openai} onChange={(v) => setSecrets((s) => ({ ...s, openai: v }))} />
      <div className="form-row">
        <div className="form-group">
          <label>{t('telefonie.openaiRealtimeModel')}</label>
          <input className="form-field" value={config.openai_realtime_model}
            onChange={(e) => set('openai_realtime_model', e.target.value)} placeholder="gpt-realtime" />
        </div>
        <div className="form-group">
          <label>{t('telefonie.openaiVoice')}</label>
          <input className="form-field" value={config.openai_voice}
            onChange={(e) => set('openai_voice', e.target.value)} placeholder="marin" />
        </div>
        <div className="form-group">
          <label>{t('telefonie.openaiSearchModel')}</label>
          <input className="form-field" value={config.openai_search_model}
            onChange={(e) => set('openai_search_model', e.target.value)} placeholder="gpt-4o-mini" />
        </div>
      </div>

      {/* --- LiveKit --- */}
      <h3 className="config-section-title">{t('telefonie.section.livekit')}</h3>
      <div className="form-row">
        <div className="form-group">
          <label>{t('telefonie.livekitUrl')}</label>
          <input className="form-field" value={config.livekit_url}
            onChange={(e) => set('livekit_url', e.target.value)} placeholder="ws://localhost:7880" />
        </div>
        <div className="form-group">
          <label>{t('telefonie.livekitPublicUrl')}</label>
          <input className="form-field" value={config.livekit_public_url}
            onChange={(e) => set('livekit_public_url', e.target.value)} placeholder="wss://your-domain:7880" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t('telefonie.livekitApiKey')}</label>
          <input className="form-field" value={config.livekit_api_key}
            onChange={(e) => set('livekit_api_key', e.target.value)} placeholder="devkey" />
        </div>
        <div className="form-group">
          <SecretField
            label={t('telefonie.livekitApiSecret')} isSet={config.has_livekit_api_secret} t={t}
            value={secrets.livekit} onChange={(v) => setSecrets((s) => ({ ...s, livekit: v }))} />
        </div>
      </div>

      {/* --- Assistant --- */}
      <h3 className="config-section-title">{t('telefonie.section.assistant')}</h3>
      <div className="form-group">
        <label>{t('telefonie.assistantName')}</label>
        <input className="form-field" value={config.assistant_name}
          onChange={(e) => set('assistant_name', e.target.value)} />
      </div>
      <div className="form-group">
        <label>{t('telefonie.assistantGreeting')}</label>
        <textarea className="form-field" rows={2} value={config.assistant_greeting}
          onChange={(e) => set('assistant_greeting', e.target.value)} />
      </div>

      {/* --- Knowledge --- */}
      <h3 className="config-section-title">{t('telefonie.section.knowledge')}</h3>
      <div className="form-row">
        <div className="form-group">
          <label>{t('telefonie.knowledgeSource')}</label>
          <select className="form-field" value={config.knowledge_source}
            onChange={(e) => set('knowledge_source', e.target.value)}>
            <option value="file">{t('telefonie.knowledge.file')}</option>
            <option value="obsidian">{t('telefonie.knowledge.obsidian')}</option>
          </select>
        </div>
        {config.knowledge_source === 'obsidian' && (
          <div className="form-group">
            <label>{t('telefonie.obsidianVault')}</label>
            <input className="form-field" value={config.obsidian_vault}
              onChange={(e) => set('obsidian_vault', e.target.value)}
              placeholder="user@example.com" />
          </div>
        )}
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? t('config.saving') : t('config.save')}
      </button>
    </div>
  )
}

function SecretField({ label, isSet, value, onChange, t }: {
  label: string; isSet: boolean; value: string
  onChange: (v: string) => void; t: (k: string) => string
}) {
  return (
    <div className="form-group">
      <label>
        {label}
        {isSet && <small className="tag"> {t('telefonie.passwordSet')}</small>}
      </label>
      <input className="form-field" type="password" value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSet ? '••••••••' : ''} autoComplete="new-password" />
    </div>
  )
}

// ===== Voice Assistant Tab (text chat) =====

function VoiceAssistant({ t }: { t: (k: string) => string }) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string; time: string }[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async () => {
    if (!message.trim() || sending) return
    const text = message.trim()
    setMessage('')
    const now = new Date().toLocaleTimeString()
    setMessages((prev) => [...prev, { role: 'user', content: text, time: now }])
    setSending(true); setError('')
    try {
      const resp = await sendVoiceMessage(text)
      const reply = resp.reply || resp.error || ''
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, time: new Date().toLocaleTimeString() }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setMessages((prev) => [...prev, { role: 'system', content: msg, time: new Date().toLocaleTimeString() }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="telefonie-voice">
      {error && <div className="telefonie-alert error"><AlertTriangle size={16} /> {error}</div>}

      <div className="voice-chat" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <Phone size={32} />
            <p>{t('telefonie.voiceEmpty')}</p>
            <small>{t('telefonie.voiceHint')}</small>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`voice-msg voice-msg--${msg.role}`}>
            <div className="voice-msg-header">
              <span className="voice-msg-role">
                {msg.role === 'user' ? t('telefonie.role.user') :
                  msg.role === 'assistant' ? t('telefonie.role.assistant') :
                    t('telefonie.role.system')}
              </span>
              <span className="voice-msg-time">{msg.time}</span>
            </div>
            <div className="voice-msg-content">{msg.content}</div>
          </div>
        ))}
        {sending && (
          <div className="voice-msg voice-msg--system">
            <Loader2 size={16} className="spin" /> {t('telefonie.thinking')}
          </div>
        )}
      </div>

      <div className="voice-input">
        <input className="form-field" value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t('telefonie.voicePlaceholder')} disabled={sending} />
        <button className="btn-primary" onClick={handleSend} disabled={sending || !message.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// ===== Call History Tab =====

function CallHistory({ t }: { t: (k: string) => string }) {
  const [calls, setCalls] = useState<Call[]>([])
  const [selected, setSelected] = useState<CallDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [calling, setCalling] = useState(false)
  const [callNumber, setCallNumber] = useState('')

  useEffect(() => { loadCalls() }, [])

  const loadCalls = async () => {
    setLoading(true)
    try {
      setCalls(await fetchCalls())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (call: Call) => {
    try { setSelected(await fetchCallDetail(call.id)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)) }
  }

  const handleStartCall = async () => {
    if (!callNumber.trim()) return
    setCalling(true); setError('')
    try {
      await startCall(callNumber.trim())
      setCallNumber('')
      await loadCalls()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCalling(false)
    }
  }

  const handleEndCall = async (callId: number) => {
    try {
      await endCall(callId)
      await loadCalls()
      if (selected?.id === callId) setSelected(await fetchCallDetail(callId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="telefonie-history">
      {error && <div className="telefonie-alert error"><AlertTriangle size={16} /> {error}</div>}

      <div className="call-actions">
        <input className="form-field" value={callNumber}
          onChange={(e) => setCallNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStartCall()}
          placeholder={t('telefonie.callPlaceholder')} />
        <button className="btn-primary" onClick={handleStartCall} disabled={calling || !callNumber.trim()}>
          <Phone size={16} /> {calling ? t('telefonie.calling') : t('telefonie.startCall')}
        </button>
      </div>

      <div className="call-layout">
        <div className="call-list">
          <h3>{t('telefonie.callList')}</h3>
          {loading && <div className="empty-state"><Loader2 size={20} className="spin" /></div>}
          {!loading && calls.length === 0 && (
            <div className="empty-state"><Phone size={24} /><p>{t('telefonie.noCalls')}</p></div>
          )}
          {calls.map((call) => (
            <div key={call.id}
              className={`call-item ${selected?.id === call.id ? 'active' : ''}`}
              role="button" tabIndex={0}
              onClick={() => handleSelect(call)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(call) } }}>
              <div className="call-item-main">
                <span className={`call-direction ${call.direction}`}>{call.direction === 'inbound' ? '←' : '→'}</span>
                <span className="call-number">{call.remote_number || t('telefonie.unknown')}</span>
                <span className={`tag call-status--${call.status}`}>{call.status}</span>
              </div>
              <div className="call-item-meta">
                <span>{new Date(call.started_at).toLocaleString()}</span>
                {call.duration_seconds != null && <span>{call.duration_seconds}s</span>}
              </div>
              {call.status !== 'ended' && call.status !== 'demo' && (
                <button className="btn-ghost call-end-btn"
                  onClick={(e) => { e.stopPropagation(); handleEndCall(call.id) }}
                  title={t('telefonie.endCall')}>
                  <PhoneOff size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="call-detail">
          {!selected ? (
            <div className="empty-state"><MessageSquare size={24} /><p>{t('telefonie.selectCall')}</p></div>
          ) : (
            <>
              <h3>{t('telefonie.dialogLog')}</h3>
              <div className="call-detail-meta">
                <span>{t('telefonie.direction')}: {selected.direction}</span>
                <span>{t('telefonie.status')}: {selected.status}</span>
                <span>{t('telefonie.started')}: {new Date(selected.started_at).toLocaleString()}</span>
                {selected.ended_at && <span>{t('telefonie.ended')}: {new Date(selected.ended_at).toLocaleString()}</span>}
              </div>
              {selected.summary && (
                <div className="call-summary">
                  <span className="call-summary-label">{t('telefonie.summary')}</span>
                  <div className="call-summary-body">{selected.summary}</div>
                </div>
              )}
              <div className="dialog-entries">
                {selected.dialog.length === 0 && (
                  <div className="empty-state"><p>{t('telefonie.noDialog')}</p></div>
                )}
                {selected.dialog.map((entry: DialogEntry) => (
                  <div key={entry.id} className={`dialog-entry dialog-entry--${entry.role}`}>
                    <div className="dialog-entry-header">
                      <span className={`dialog-role dialog-role--${entry.role}`}>
                        {entry.role === 'user' ? t('telefonie.role.user') :
                          entry.role === 'assistant' ? t('telefonie.role.assistant') :
                            t('telefonie.role.system')}
                      </span>
                      <span className="dialog-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      {entry.status !== 'ok' && <span className={`tag tag--${entry.status}`}>{entry.status}</span>}
                    </div>
                    <div className="dialog-content">{entry.content}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <PhonebookPanel t={t} />
    </div>
  )
}

// ===== Phonebook editor (Telefonate tab) =====
function PhonebookPanel({ t }: { t: (k: string) => string }) {
  const empty = { number: '', name: '', notes: '' }
  const [contacts, setContacts] = useState<PhonebookContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null) // original number, '' = new
  const [draft, setDraft] = useState<{ number: string; name: string; notes: string }>(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      setContacts(await fetchPhonebook())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const startNew = () => { setEditing(''); setDraft(empty) }
  const startEdit = (c: PhonebookContact) => {
    setEditing(c.number)
    setDraft({ number: c.number, name: c.name, notes: (c.notes || []).join('\n') })
  }
  const cancel = () => { setEditing(null); setDraft(empty) }

  const save = async () => {
    if (!draft.number.trim()) { setError(t('telefonie.pb.numberRequired')); return }
    setSaving(true); setError('')
    try {
      await savePhonebookContact({
        number: draft.number.trim(),
        name: draft.name.trim(),
        notes: draft.notes.split('\n').map((n) => n.trim()).filter(Boolean),
        original_number: editing || undefined,
      })
      cancel()
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (number: string) => {
    if (!window.confirm(t('telefonie.pb.confirmDelete'))) return
    try {
      await deletePhonebookContact(number)
      if (editing === number) cancel()
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="phonebook-panel">
      <div className="phonebook-head">
        <h3><BookUser size={16} /> {t('telefonie.pb.title')}</h3>
        {editing === null && (
          <button className="btn-ghost" onClick={startNew}><Plus size={14} /> {t('telefonie.pb.add')}</button>
        )}
      </div>
      {error && <div className="telefonie-alert error"><AlertTriangle size={16} /> {error}</div>}

      {editing !== null && (
        <div className="phonebook-edit">
          <div className="phonebook-edit-row">
            <input className="form-field" value={draft.number}
              onChange={(e) => setDraft({ ...draft, number: e.target.value })}
              placeholder={t('telefonie.pb.number')} />
            <input className="form-field" value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={t('telefonie.pb.name')} />
          </div>
          <textarea className="form-field phonebook-notes" value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder={t('telefonie.pb.notesPlaceholder')} rows={4} />
          <div className="phonebook-edit-actions">
            <button className="btn-primary" onClick={save} disabled={saving}>
              <Save size={14} /> {t('telefonie.pb.save')}
            </button>
            <button className="btn-ghost" onClick={cancel}><X size={14} /> {t('telefonie.pb.cancel')}</button>
          </div>
        </div>
      )}

      {loading && <div className="empty-state"><Loader2 size={20} className="spin" /></div>}
      {!loading && contacts.length === 0 && editing === null && (
        <div className="empty-state"><BookUser size={24} /><p>{t('telefonie.pb.empty')}</p></div>
      )}
      <div className="phonebook-list">
        {contacts.map((c) => (
          <div key={c.number} className="phonebook-item">
            <div className="phonebook-item-main">
              <span className="phonebook-name">{c.name || t('telefonie.unknown')}</span>
              <span className="phonebook-number">{c.number}</span>
            </div>
            {c.notes && c.notes.length > 0 && (
              <ul className="phonebook-item-notes">
                {c.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}
            <div className="phonebook-item-actions">
              <button className="btn-ghost" onClick={() => startEdit(c)} title={t('telefonie.pb.edit')}>
                <Settings size={14} />
              </button>
              <button className="btn-ghost" onClick={() => remove(c.number)} title={t('telefonie.pb.delete')}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
